const STORAGE_KEYS = {
  USERS: "ai_assessment_users",
  CURRENT_USER: "auth_user",
  CHAPTERS: "ai_assessment_chapters",
  PAPERS: "ai_assessment_papers",
};

function getData(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createId() {
  return Date.now().toString();
}

const extractTextFromMockPDF = async (file) => {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(
        "Extracted text from " +
          file.name +
          ". This chapter contains concepts related to motion, distance, displacement, speed, velocity, uniform motion and non-uniform motion."
      );
    }, 800)
  );
};

const API = {
  auth: {
    getUser: () => {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || "null");
    },

    checkAuth: () => {
      const isAuthPage =
        window.location.pathname.includes("login") ||
        window.location.pathname.includes("signup");

      if (!API.auth.getUser() && !isAuthPage) {
        window.location.href = "login.html";
      }
    },

    login: async (email, password) => {
      const users = getData(STORAGE_KEYS.USERS);

      const user = users.find(
        (u) => u.Email === email && u.Password === password
      );

      if (!user) {
        throw new Error("Invalid email or password");
      }

      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    },

    signup: async (name, email, password) => {
      const users = getData(STORAGE_KEYS.USERS);

      const existingUser = users.find((u) => u.Email === email);
      if (existingUser) {
        throw new Error("Email already exists");
      }

      const user = {
        id: createId(),
        Name: name,
        Email: email,
        Password: password,
        Role: "Teacher",
        CreatedAt: new Date().toISOString(),
      };

      users.push(user);
      setData(STORAGE_KEYS.USERS, users);

      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    },

    logout: () => {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      window.location.href = "login.html";
    },
  },

  chapters: {
    list: async () => {
      return getData(STORAGE_KEYS.CHAPTERS);
    },

    create: async (name, subject, classLevel, file) => {
      const chapters = getData(STORAGE_KEYS.CHAPTERS);

      const text = file
        ? await extractTextFromMockPDF(file)
        : "Sample extracted chapter text.";

      const chapter = {
        id: createId(),
        Name: name,
        Subject: subject,
        ClassLevel: classLevel,
        Text: text,
        Summary:
          "AI-generated summary containing key chapter concepts for paper generation.",
        Status: "Processed",
        UploadDate: new Date().toLocaleDateString(),
      };

      chapters.push(chapter);
      setData(STORAGE_KEYS.CHAPTERS, chapters);

      return chapter;
    },

    delete: async (id) => {
      const chapters = getData(STORAGE_KEYS.CHAPTERS).filter(
        (chapter) => chapter.id !== id
      );

      setData(STORAGE_KEYS.CHAPTERS, chapters);
      return true;
    },
  },

  papers: {
    list: async () => {
      return getData(STORAGE_KEYS.PAPERS);
    },

    generate: async (subject, chapter, setNumber) => {
      const papers = getData(STORAGE_KEYS.PAPERS);

      const existingPaper = papers.find(
        (p) =>
          p.Subject === subject &&
          p.Chapter === chapter &&
          p.SetNumber === setNumber.toString()
      );

      if (existingPaper) {
        return {
          ...existingPaper,
          Loaded: true,
        };
      }

      const questions = `QUESTION PAPER

PAPER SET ${setNumber}

Section A: Easy MCQs

1. What is motion?
A) Change in position with time
B) Change in mass
C) Change in force
D) Change in shape

2. What is distance?
A) Shortest path
B) Total path covered
C) Speed per unit time
D) Force applied

Section B: Medium Short Answer Questions

1. Explain the difference between distance and displacement.

2. What is uniform motion?

Section C: Hard Long Answer Questions

1. Explain graphical representation of motion.`;

      const answers = `ANSWER KEY - PAPER SET ${setNumber}

Section A: MCQ Answers
1. A) Change in position with time
2. B) Total path covered

Section B: Short Answers
1. Distance is the total path covered, while displacement is the shortest distance between initial and final position.
2. Uniform motion means covering equal distances in equal intervals of time.

Section C: Long Answers
1. Motion can be represented graphically using time on the x-axis and distance or displacement on the y-axis.`;

      const paper = {
        id: createId(),
        Subject: subject,
        Chapter: chapter,
        SetNumber: setNumber.toString(),
        Questions: questions,
        Answers: answers,
        CreatedAt: new Date().toLocaleString(),
        Status: "Generated",
        Loaded: false,
      };

      papers.push(paper);
      setData(STORAGE_KEYS.PAPERS, papers);

      return paper;
    },
  },

  homework: {
    validateManual: async (question, expected, studentAnswer, marks) => {
      return {
        marks: `${Math.max(1, marks - 1)}/${marks}`,
        correctPoints: [
          "Student has understood the main concept.",
          "Answer is relevant to the question.",
        ],
        missingPoints: [
          "Answer can include more supporting details from the chapter.",
        ],
        incorrectPoints: [],
        grammar: "Minor grammar improvements are suggested.",
        feedback:
          "Good answer. The student should add one or two more conceptual points for full marks.",
        improved:
          expected || "Improved answer will be generated based on chapter knowledge.",
      };
    },
  },
};

window.API = API;