class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Error:", error);
  }

  render() {
    return this.state.hasError
      ? <div className="p-8 text-red-500">Error loading page</div>
      : this.props.children;
  }
}

function ValidationApp() {
  const generatedPapers = JSON.parse(
  localStorage.getItem("generated_papers") || "[]"
);
const getSelectedPaper = () => {
  return generatedPapers.find(
    (paper) => paper.id === selectedPaperId
  );
};

const [selectedPaperId, setSelectedPaperId] = React.useState(
  generatedPapers[0]?.id || ""
);
const [loading, setLoading] = React.useState(false);
const [toast, setToast] = React.useState(null);
const [validationResult, setValidationResult] = React.useState(null);


    const [ocrStep, setOcrStep] = React.useState(0);
    const [ocrUploading, setOcrUploading] = React.useState(false);
    const [rawOcrText, setRawOcrText] = React.useState("");
    const [uploadedNotebookFile, setUploadedNotebookFile] = React.useState(null);
    const [uploadedNotebookPreview, setUploadedNotebookPreview] = React.useState("");
    const notebookInputRef = React.useRef(null);
    const [cleanedText, setCleanedText] = React.useState("");
    const [extractedResults, setExtractedResults] = React.useState([]);

    const showToast = (msg) => {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    };
    const callGroq = async (prompt) => {
      const groqKey = localStorage.getItem("groq_api_key");
      const model = localStorage.getItem("ai_model") || "qwen/qwen3-32b";

      if (!groqKey) {
        throw new Error("Groq API key not found. Please save it in Settings.");
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Groq API failed: " + errorText);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    };
    const handleHomeworkValidation = async () => {
  setLoading(true);
  setValidationResult(null);

  try {

    const selectedPaper = getSelectedPaper();

    if (!selectedPaper) {
      throw new Error("Please select a generated paper.");
    }

    if (!cleanedText.trim()) {
      throw new Error("Please upload a notebook image first.");
    }
    const prompt = `
You are a school teacher.

Compare the student's OCR answers with the official answer key.

Rules:
- Use ONLY the provided answer key.
- Do NOT use external knowledge.
- Ignore OCR spelling mistakes if the intended answer is clear.
- Accept equivalent answers.
- Award partial marks where appropriate.
- Match student answers to the corresponding questions.

Return ONLY in this format:

Q1
Student Answer:
Correct Answer:
Marks:
Feedback:

Q2
Student Answer:
Correct Answer:
Marks:
Feedback:

...

TOTAL MARKS:
__/__

ANSWER KEY:
${selectedPaper.answers}

STUDENT ANSWERS:
${cleanedText}
`;
const result = await callGroq(prompt);

setValidationResult(result);

// Optional: agar extractedResults UI me dikhana hai
setExtractedResults([
  {
    id: 1,
    text: result,
  },
]);

showToast("Homework validated successfully.");

} catch (error) {
  console.error(error);
  showToast(error.message || "Homework validation failed.");
} finally {
  setLoading(false);
}
};
    const preprocessImageForOCR = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scale = 6;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        gray = gray * 1.35 + 25;
        if (gray > 255) gray = 255;
        const threshold = gray > 160 ? 255 : 0;

        data[i] = threshold;
        data[i + 1] = threshold;
        data[i + 2] = threshold;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    };

    img.onerror = reject;
    img.src = url;
  });
};


const handleOcrUpload = async (file) => {
  if (!file) {
    showToast("Please upload a notebook image first.");
    return;
  }

  setOcrUploading(true);

  try {
    const previewUrl = URL.createObjectURL(file);

    setUploadedNotebookFile(file);
    setUploadedNotebookPreview(previewUrl);

    const processedImage = await preprocessImageForOCR(file);
    const result = await Tesseract.recognize(
  processedImage,
  "eng",
  {
    logger: (m) => console.log(m),
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
    preserve_interword_spaces: "1",
  }
);
const extractedText = result.data.text || "";

if (!extractedText.trim()) {
  throw new Error("No text detected in notebook image.");
}

// Keep original OCR
setRawOcrText(extractedText);

// Clean OCR text
const cleaned = extractedText
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

setCleanedText(cleaned);

setOcrUploading(false);
setOcrStep(1);

showToast("Notebook image OCR completed.");

} catch (error) {
  console.error(error);
  setOcrUploading(false);
  showToast(error.message || "OCR failed.");
}
};
    const handleOcrExtract = async () => {
      setLoading(true);

      try {
        if (!cleanedText.trim()) {
  throw new Error("Please upload a notebook image first.");
}

const selectedPaper = getSelectedPaper();

if (!selectedPaper) {
  throw new Error("Please select a generated paper.");
}
const selectedPaper = getSelectedPaper();

const prompt = `
You are a school teacher.

Evaluate the student's OCR answers using ONLY the official answer key.

Rules:
- Use only the answer key.
- Ignore OCR spelling mistakes if the intended answer is clear.
- Accept equivalent answers.
- Award partial marks where appropriate.
- Do not use external knowledge.
- Match student answers with the corresponding questions.

Return ONLY in this format:

Q1
Student Answer:
Correct Answer:
Marks:
Feedback:

Q2
Student Answer:
Correct Answer:
Marks:
Feedback:

...

TOTAL MARKS:
__/__

ANSWER KEY:
${selectedPaper.answers}

STUDENT ANSWERS:
${cleanedText}
`;
const content = await callGroq(prompt);

setValidationResult(content);

const blocks = content
  .split(/\n(?=Q\d)/)
  .map((b) => b.trim())
  .filter(Boolean);

const parsed = blocks.map((block, index) => ({
  id: index + 1,
  text: block,
}));

setExtractedResults(
  parsed.length
    ? parsed
    : [
        {
          id: 1,
          text: content,
        },
      ]
);

setOcrStep(2);

showToast("Homework validated successfully.");

} catch (error) {
  console.error(error);
  showToast(error.message || "Homework validation failed.");
} finally {
  setLoading(false);
}
};

    return (
      <DashboardLayout title="Homework Validation">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Select Generated Question Paper
          </label>

  <select
    className="input-field"
    value={selectedPaperId}
    onChange={(e) => setSelectedPaperId(Number(e.target.value))}
  >
    {generatedPapers.map((paper) => (
      <option key={paper.id} value={paper.id}>
        {paper.subject} | {paper.chapter} | {paper.set}
      </option>
    ))}
  </select>
</div>
          <div className="space-y-6">
            {ocrStep === 0 && (
  <div className="card p-12 text-center">
    <input
      type="file"
      accept="image/png,image/jpeg,image/jpg"
      ref={notebookInputRef}
      className="hidden"
      onChange={(e) => handleOcrUpload(e.target.files[0])}
    />

    <div
      className={`border-2 border-dashed ${
        ocrUploading ? "border-[var(--primary)] bg-indigo-50" : "border-gray-300 hover:bg-gray-50"
      } rounded-xl p-12 transition-colors cursor-pointer`}
      onClick={() => !ocrUploading && notebookInputRef.current.click()}
    >
      {ocrUploading ? (
        <div className="icon-loader animate-spin text-5xl text-[var(--primary)] mb-4 w-16 h-16 flex items-center justify-center mx-auto"></div>
      ) : (
        <div className="icon-cloud-upload text-5xl text-[var(--primary)] mb-4 w-16 h-16 flex items-center justify-center mx-auto"></div>
      )}

      <h3 className="text-lg font-bold text-gray-900">
        {ocrUploading ? "Extracting text from notebook..." : "Click to Upload Notebook Image"}
      </h3>

      <p className="text-gray-500 mt-2">
        Supports JPG and PNG notebook images
      </p>
    </div>
  </div>
)}
            {ocrStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                <div className="card p-6">
                  <h3 className="font-semibold mb-4 text-gray-900">Raw OCR Text</h3>
                  <textarea className="input-field h-72 font-mono text-sm bg-gray-50 text-gray-600" readOnly value={rawOcrText}></textarea>
                </div>

                <div className="card p-6 flex flex-col">
                  <h3 className="font-semibold mb-4 text-gray-900">
  Cleaned OCR Text
</h3>
                  <textarea
                  className="input-field h-72 font-mono text-sm"
                  value={cleanedText}
                  readOnly
                  ></textarea>

                  <div className="mt-4 flex justify-end">
                    <button className="btn-primary" onClick={handleOcrExtract} disabled={loading}>
                      {loading ? <div className="icon-loader animate-spin"></div> : <div className="icon-wand-sparkles"></div>}
                      {loading ? "Validating Homework..." : "Validate Homework"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {ocrStep === 2 && (
              <div className="card p-0 animate-fade-in">
                <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">
  Homework Validation Result
</h3>

      <button
        className="btn-secondary text-sm"
        onClick={() => setOcrStep(0)}
      >
        <div className="icon-refresh-cw"></div>
        New Upload
      </button>
    </div>

    <div className="p-6 space-y-4">
      {extractedResults.map((item) => (
        <div
          key={item.id}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {item.text}
          </pre>
        </div>
      ))}
    </div>

    <div className="p-4 border-t border-[var(--border-color)] bg-gray-50 flex justify-end gap-3">
      <button
  className="btn-primary"
  onClick={() =>
    showToast("Homework validation completed.")
  }
>
  <div className="icon-circle-check"></div>
  Done
</button>
    </div>
  </div>
)}
</div>
{toast && (
  <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up z-50">
    <div className="icon-circle-check text-green-400"></div>
    {toast}
  </div>
)}

</DashboardLayout>
);
}

const root = ReactDOM.createRoot(
  document.getElementById("root")
);

root.render(
  <ErrorBoundary>
    <ValidationApp />
  </ErrorBoundary>
);