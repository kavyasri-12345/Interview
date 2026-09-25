const { GoogleGenAI, Type } = require("@google/genai");
const Interview = require("../models/Interview");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log("Gemini API key loaded:", !!GEMINI_API_KEY);

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  vertexai: false,
});

const generateInterview = async (req, res) => {
  try {
    const { role, difficulty } = req.body;

    if (!role || !difficulty) {
      return res.status(400).json({
        message: "Role and difficulty are required",
      });
    }

    const prompt = `
Generate exactly 5 ${difficulty} interview questions
for a ${role} position.

The questions should test:
- Technical knowledge
- Problem-solving ability
- Practical understanding

Return ONLY a valid JSON array.
Do not use markdown.
Do not add explanations.

Format:
[
  {"question": "Question 1"},
  {"question": "Question 2"},
  {"question": "Question 3"},
  {"question": "Question 4"},
  {"question": "Question 5"}
]
`;

    console.log(`Generating ${difficulty} interview for ${role}...`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text;

    console.log("Gemini response received.");

    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const questions = JSON.parse(text);

    const interview = await Interview.create({
      user: req.user._id,
      role,
      difficulty,
      questions,
      progress: 0,
    });

    res.status(201).json({
      message: "Interview generated successfully",
      interview,
    });
  } catch (error) {
    console.error("Interview generation error:", error);

    res.status(500).json({
      message: "Failed to generate interview",
      error: error.message,
    });
  }
};

const evaluateInterview = async (req, res) => {
  try {
    const { interviewId, answers } = req.body;

    if (!interviewId || !answers) {
      return res.status(400).json({
        message: "Interview ID and answers are required",
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      user: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    const evaluationPrompt = `
You are an expert technical interviewer.

Evaluate the candidate's answers for a ${interview.role} interview.
Difficulty level: ${interview.difficulty}.

For every question:

1. Give a score from 0 to 10.
2. Give detailed but concise constructive AI feedback.
3. Explain what the candidate did well.
4. Explain what could be improved.
5. Give a useful suggestion for a better interview answer.

Questions and candidate answers:

${interview.questions
  .map(
    (item, index) => `
Question ${index + 1}:
${item.question}

Candidate Answer:
${answers[index] || "No answer provided"}
`
  )
  .join("\n")}

Return one evaluation result for EVERY question.

The feedback must NOT be empty.
The feedback must be specific to the question and candidate answer.
`;

    console.log("Sending answers to Gemini for evaluation...");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",

      contents: evaluationPrompt,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            results: {
              type: Type.ARRAY,

              items: {
                type: Type.OBJECT,

                properties: {
                  questionNumber: {
                    type: Type.INTEGER,
                  },

                  score: {
                    type: Type.NUMBER,
                  },

                  feedback: {
                    type: Type.STRING,
                  },
                },

                required: [
                  "questionNumber",
                  "score",
                  "feedback",
                ],
              },
            },
          },

          required: ["results"],
        },
      },
    });

    const evaluation = JSON.parse(response.text);

    console.log(
      "Gemini evaluation received:",
      evaluation
    );

    if (
      !evaluation.results ||
      !Array.isArray(evaluation.results)
    ) {
      throw new Error(
        "Invalid evaluation response from Gemini"
      );
    }

    let totalScore = 0;

    interview.questions.forEach((question, index) => {
      const result = evaluation.results[index];

      const score = Math.max(
        0,
        Math.min(10, Number(result?.score) || 0)
      );

      const feedback =
        result?.feedback?.trim() ||
        "The answer was evaluated, but no detailed feedback was returned.";

      question.answer =
        answers[index] || "";

      question.score = score;

      question.feedback = feedback;

      totalScore += score;
    });

    totalScore = Math.round(
      (totalScore /
        (interview.questions.length * 10)) *
        100
    );

    interview.totalScore = totalScore;
    interview.progress = 100;
    interview.completed = true;

    await interview.save();

    console.log(
      "Interview evaluated successfully"
    );

    console.log(
      "Total Score:",
      totalScore
    );

    res.json({
      message: "Interview evaluated successfully",

      interview,

      evaluation: {
        totalScore,
        results: evaluation.results,
      },
    });
  } catch (error) {
    console.error(
      "Evaluation error:",
      error
    );

    res.status(500).json({
      message: "Failed to evaluate interview",
      error: error.message,
    });
  }
};
const getInterviewHistory = async (req, res) => {
  try {
    const interviews = await Interview.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .select(
        "role difficulty totalScore progress completed createdAt"
      );

    res.json({
      interviews,
    });
  } catch (error) {
    console.error("History error:", error);

    res.status(500).json({
      message: "Failed to fetch interview history",
    });
  }
};
const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    res.json({
      interview,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch interview",
    });
  }
};
// =========================================
// TRANSCRIBE AUDIO
// =========================================

const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No audio file received",
      });
    }

    console.log(
      "Audio received:",
      req.file.mimetype,
      req.file.size
    );

    const audioBase64 =
      req.file.buffer.toString("base64");

    const response =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",

        contents: [
          {
            role: "user",

            parts: [
              {
                text: `
Transcribe the speech in this audio.

Return ONLY the spoken words as plain text.

Do not add:
- explanations
- labels
- quotation marks
- summaries
- corrections

Keep the speaker's words as naturally as possible.
`,
              },

              {
                inlineData: {
                  mimeType:
                    req.file.mimetype,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
      });

    const transcript =
      response.text?.trim() || "";

    console.log(
      "Transcript:",
      transcript
    );

    if (!transcript) {
      return res.status(400).json({
        message:
          "Could not detect speech in the audio.",
      });
    }

    res.json({
      transcript,
    });
  } catch (error) {
    console.error(
      "Transcription error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to transcribe audio.",
      error: error.message,
    });
  }
};
module.exports = {
  generateInterview,
  evaluateInterview,
  getInterviewHistory,
  transcribeAudio,
};