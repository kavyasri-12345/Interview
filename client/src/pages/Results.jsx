import { useNavigate } from "react-router-dom";

function Results() {
  const navigate = useNavigate();

  const interview = JSON.parse(
    localStorage.getItem("completedInterview") || "null"
  );

  // No results
  if (!interview) {
    return (
      <div className="results-page">
        <div className="no-results-card">
          <div className="no-results-icon">📊</div>

          <h1>No Results Found</h1>

          <p>
            Complete an interview to see your
            performance and AI feedback.
          </p>

          <button
            className="primary-btn"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalScore = Number(interview.totalScore) || 0;

  const questions = interview.questions || [];

  const answeredQuestions = questions.filter(
    (item) => item.answer && item.answer.trim()
  ).length;

  const totalQuestions = questions.length;

  const averageQuestionScore =
    totalQuestions > 0
      ? (totalScore / totalQuestions).toFixed(1)
      : "0.0";

  // Score message
  const getScoreMessage = () => {
    if (totalScore >= 80) {
      return "Excellent performance!";
    }

    if (totalScore >= 60) {
      return "Good performance. Keep improving!";
    }

    if (totalScore >= 40) {
      return "Good start. More practice will help!";
    }

    return "Keep practicing and improve your fundamentals.";
  };

  return (
    <div className="results-page">

      {/* =========================
          HEADER
      ========================= */}

      <header className="results-header">

        <div>
          <div className="results-brand">
            AI Mock Interview
          </div>

          <h1>Interview Results</h1>

          <p>
            {interview.role}{" "}
            <span>•</span>{" "}
            {interview.difficulty} Level
          </p>
        </div>

        <button
          className="header-dashboard-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>

      </header>

      <main className="results-container">

        {/* =========================
            SCORE OVERVIEW
        ========================= */}

        <section className="score-overview">

          <div className="score-circle">

            <div className="score-circle-inner">

              <strong>
                {totalScore}
              </strong>

              <span>/100</span>

            </div>

          </div>

          <div className="score-summary">

            <h2>
              {getScoreMessage()}
            </h2>

            <p>
              Here is your performance summary
              based on this mock interview.
            </p>

            <div className="score-stats">

              <div className="score-stat">

                <span>
                  Questions
                </span>

                <strong>
                  {totalQuestions}
                </strong>

              </div>

              <div className="score-stat">

                <span>
                  Answered
                </span>

                <strong>
                  {answeredQuestions}
                </strong>

              </div>

              <div className="score-stat">

                <span>
                  Avg. Score
                </span>

                <strong>
                  {averageQuestionScore}/10
                </strong>

              </div>

            </div>

          </div>

        </section>

        {/* =========================
            QUESTIONS
        ========================= */}

        <section className="questions-section">

          <div className="section-heading">

            <div>
              <h2>
                Question-wise Evaluation
              </h2>

              <p>
                Review your answers and AI-generated
                feedback.
              </p>
            </div>

          </div>

          <div className="results-list">

            {questions.map((item, index) => {

              const score = Number(item.score) || 0;

              return (
                <article
                  className="result-question-card"
                  key={index}
                >

                  {/* QUESTION HEADER */}

                  <div className="question-card-header">

                    <div className="question-label">
                      Question {index + 1}
                    </div>

                    <div
                      className={`question-score ${
                        score >= 8
                          ? "score-excellent"
                          : score >= 6
                          ? "score-good"
                          : score >= 4
                          ? "score-average"
                          : "score-low"
                      }`}
                    >
                      {score}/10
                    </div>

                  </div>

                  {/* QUESTION */}

                  <h3 className="result-question-title">
                    {item.question}
                  </h3>

                  {/* ANSWER */}

                  <div className="answer-section">

                    <div className="section-label">
                      <span className="label-icon">
                        👤
                      </span>

                      Your Answer
                    </div>

                    <div className="answer-box">

                      {item.answer &&
                      item.answer.trim() ? (
                        <p>
                          {item.answer}
                        </p>
                      ) : (
                        <p className="empty-answer">
                          No answer provided.
                        </p>
                      )}

                    </div>

                  </div>

                  {/* AI FEEDBACK */}

                  <div className="feedback-section">

                    <div className="section-label ai-label">
                      <span className="label-icon">
                        ✨
                      </span>

                      AI Feedback
                    </div>

                    <div className="feedback-box">

                      <p>
                        {item.feedback &&
                        item.feedback.trim()
                          ? item.feedback
                          : "No feedback available for this question."}
                      </p>

                    </div>

                  </div>

                </article>
              );
            })}

          </div>

        </section>

        {/* =========================
            ACTIONS
        ========================= */}

        <section className="results-actions">

          <button
            className="secondary-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>

          <button
            className="primary-btn"
            onClick={() => {
              localStorage.removeItem(
                "completedInterview"
              );

              navigate("/dashboard");
            }}
          >
            Start New Interview →
          </button>

        </section>

      </main>

    </div>
  );
}

export default Results;