// chatbot-app.js
// AI Tutor module — same pattern as generator-app.js / reports-app.js
// Uses window.DashboardLayout, window.Toast (if present in the portal) and
// falls back to a simple local layout/toast if those aren't loaded, so this
// file works standalone while you wire it into the rest of the app.

const { useState, useEffect, useRef } = React;

// ---------------------------------------------------------------------
// CONFIG — the only two things you'll touch when the backend is ready
// ---------------------------------------------------------------------

// Where the teammate's FastAPI backend chat endpoint lives.
// Leave BACKEND_CONNECTED = false to keep using dummy answers.
const BACKEND_CONNECTED = true;
const CHAT_ENDPOINT = "https://chapter-doubt-chatbot.onrender.com/chat";

// The localStorage key your other modules use to store saved chapters.
// Adjust this if Chapter Management saves under a different key.
const CHAPTERS_STORAGE_KEY = "chapters";

// ---------------------------------------------------------------------
// Small local fallbacks (only used if the shared components aren't found)
// ---------------------------------------------------------------------

function FallbackLayout({ title, subtitle, children }) {
    return (
        <div className="min-h-screen bg-[var(--bg-body)]">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">{title}</h1>
                    {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

function showToast(message, type) {
    if (window.Toast && typeof window.Toast.show === "function") {
        window.Toast.show(message, type);
        return;
    }
    // very light fallback so nothing breaks if Toast isn't loaded
    console.log(`[${type || "info"}] ${message}`);
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

async function loadSavedChapters() {
    if (BACKEND_CONNECTED) {
        try {
            const res = await fetch(CHAT_ENDPOINT.replace(/\/chat$/, "/chapters"));
            if (!res.ok) throw new Error(`status ${res.status}`);
            const data = await res.json();
            // Matches ChapterListResponse: { chapters: [{ chapter_id, name, subject, ... }] }
            return (data.chapters || []).filter((c) => c.chapter_id !== "string");
        } catch (err) {
            console.error("Could not load chapters from backend:", err);
            return [];
        }
    }

    // Dummy mode: fall back to whatever the rest of the portal saved locally
    try {
        const raw = localStorage.getItem(CHAPTERS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("Could not read saved chapters:", err);
        return [];
    }
}

function getDummyAnswer(question, chapterName) {
    if (!question || !question.trim()) {
        return "Please type a question first.";
    }
    const label = chapterName ? ` for "${chapterName}"` : "";
    return (
        `Backend not connected yet.\n\n` +
        `Once the AI Tutor backend is live, I'll answer this question${label} ` +
        `using the chapter content you've uploaded. For now this is a placeholder ` +
        `response so you can test the chat UI end to end.`
    );
}

// Backend's ChatRequest expects chat_history entries shaped like
// { role: "user" | "assistant", content: string } — our UI stores
// messages as { role: "user" | "bot", text }, so we convert here.
function toBackendHistory(messages) {
    return messages
        .filter((m) => !m.isTyping)
        .slice(-6) // keep the payload small; last few turns is plenty for follow-ups
        .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
        }));
}

async function askBackend(question, chapter, priorMessages) {
    if (!chapter || !(chapter.id || chapter.chapter_id)) {
        throw new Error("NO_CHAPTER_SELECTED");
    }

    const chapterId = chapter.chapter_id || chapter.id;

    const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chapter_id: chapterId,
            question: question,
            chat_history: toBackendHistory(priorMessages),
            // top_k: leave unset to use the backend's default retrieval depth
        }),
    });

    if (response.status === 404) {
        throw new Error("CHAPTER_NOT_FOUND");
    }
    if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
    }

    // Matches ChatResponse: { answer, chapter_id, sources, grounded }
    const data = await response.json();
    return {
        answer: data.answer || "No answer returned by the backend.",
        grounded: data.grounded,
        sources: data.sources || [],
    };
}

// ---------------------------------------------------------------------
// Chat message bubble
// ---------------------------------------------------------------------

function ChatBubble({ role, text, isTyping }) {
    const isUser = role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center mr-2 shrink-0">
                    <i className="lucide-bot text-sm"></i>
                </div>
            )}
            <div
                className={
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed " +
                    (isUser
                        ? "bg-[var(--primary)] text-white rounded-br-sm"
                        : "bg-gray-100 text-[var(--text-main)] rounded-bl-sm")
                }
            >
                {isTyping ? (
                    <span className="inline-flex gap-1 items-center py-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    </span>
                ) : (
                    text
                )}
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center ml-2 shrink-0">
                    <i className="lucide-user text-sm"></i>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------

function ChatbotApp() {
    const [chapters, setChapters] = useState([]);
    const [selectedChapterId, setSelectedChapterId] = useState("");
    const [messages, setMessages] = useState([
        {
            role: "bot",
            text: "Hi! I'm your AI Tutor. Pick a chapter on the left and ask me anything about it.",
        },
    ]);
    const [question, setQuestion] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        loadSavedChapters().then(setChapters);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isSending]);

    const selectedChapter =
        chapters.find(
            (c) => String(c.id || c.chapter_id) === String(selectedChapterId)
        ) || null;

    async function handleSend() {
        const trimmed = question.trim();
        if (!trimmed) return;

        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        setQuestion("");
        setIsSending(true);

        try {
            let answer;
            if (BACKEND_CONNECTED) {
                const result = await askBackend(trimmed, selectedChapter, messages);
                answer = result.answer;
                if (result.grounded === false) {
                    answer += "\n\n(This chapter didn't have material directly covering that — answer may be incomplete.)";
                }
            } else {
                // simulate a short delay so the typing indicator is visible
                await new Promise((res) => setTimeout(res, 600));
                answer = getDummyAnswer(trimmed, selectedChapter && selectedChapter.name);
            }
            setMessages((prev) => [...prev, { role: "bot", text: answer }]);
        } catch (err) {
            console.error(err);
            let errorText = "Something went wrong reaching the AI Tutor. Please try again.";
            if (err.message === "NO_CHAPTER_SELECTED") {
                errorText = "Please select a chapter from the dropdown first — the AI Tutor needs to know which chapter to search.";
            } else if (err.message === "CHAPTER_NOT_FOUND") {
                errorText = "No material found for this chapter yet. Ask your teacher to upload it first.";
            }
            setMessages((prev) => [...prev, { role: "bot", text: errorText }]);
            showToast("Could not get a response from the AI Tutor", "error");
        } finally {
            setIsSending(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleClearChat() {
        setMessages([
            { role: "bot", text: "Chat cleared. Ask me anything about your chapter." },
        ]);
    }

    const Layout = window.DashboardLayout || FallbackLayout;

    return (
        <Layout title="AI Tutor" subtitle="Ask doubts from your uploaded chapters">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left panel — Knowledge Base */}
                <div className="lg:col-span-1">
                    <div className="card p-5">
                        <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <i className="lucide-book-open"></i>
                            Knowledge Base
                        </h3>

                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            Chapter
                        </label>
                        <select
                            className="input-field mb-4"
                            value={selectedChapterId}
                            onChange={(e) => setSelectedChapterId(e.target.value)}
                        >
                            <option value="">All chapters</option>
                            {chapters.map((c) => (
                                <option
                                    key={c.id || c.chapter_id || c.name}
                                    value={c.id || c.chapter_id || c.name}
                                >
                                    {c.subject ? `${c.subject} — ${c.name}` : c.name}
                                </option>
                            ))}
                        </select>

                        {chapters.length === 0 && (
                            <p className="text-xs text-gray-400 mb-4">
                                No saved chapters found yet. Upload one from Chapter Management
                                to get chapter-specific answers.
                            </p>
                        )}

                        {selectedChapter && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700 mb-4">
                                Answers will be based on <strong>{selectedChapter.name}</strong>.
                            </div>
                        )}

                        <button className="btn-secondary w-full justify-center" onClick={handleClearChat}>
                            <i className="lucide-trash-2"></i>
                            Clear Chat
                        </button>

                        {!BACKEND_CONNECTED && (
                            <div className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                                Backend not connected — showing placeholder answers.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right panel — Chat */}
                <div className="lg:col-span-3">
                    <div className="card flex flex-col h-[70vh]">
                        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                                <i className="lucide-bot text-sm"></i>
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-[var(--text-main)]">AI Tutor</p>
                                <p className="text-xs text-gray-400">
                                    {selectedChapter ? selectedChapter.name : "General chapter help"}
                                </p>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
                            {messages.map((m, i) => (
                                <ChatBubble key={i} role={m.role} text={m.text} />
                            ))}
                            {isSending && <ChatBubble role="bot" isTyping={true} />}
                        </div>

                        <div className="border-t border-[var(--border-color)] p-4">
                            <div className="flex items-end gap-2">
                                <textarea
                                    className="input-field resize-none"
                                    rows={1}
                                    placeholder="Type your question..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isSending}
                                />
                                <button
                                    className="btn-primary shrink-0"
                                    onClick={handleSend}
                                    disabled={isSending || !question.trim()}
                                >
                                    <i className="lucide-send"></i>
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// ---------------------------------------------------------------------
// Mount (with a minimal error boundary so a render error doesn't blank the page)
// ---------------------------------------------------------------------

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("ChatbotApp crashed:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center text-red-600">
                    Something went wrong loading the AI Tutor. Check the console for details.
                </div>
            );
        }
        return this.props.children;
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <ErrorBoundary>
        <ChatbotApp />
    </ErrorBoundary>
);
