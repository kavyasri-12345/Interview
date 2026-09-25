import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  // =========================
  // USER
  // =========================

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // =========================
  // STATES
  // =========================

  const [role, setRole] = useState("Java Developer");

  const [difficulty, setDifficulty] =
    useState("Medium");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [interviews, setInterviews] =
    useState([]);

  // =========================
  // FETCH HISTORY
  // =========================

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(
        "http://localhost:5000/api/interviews/history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "Interview history:",
        response.data
      );

      setInterviews(
        response.data.interviews || []
      );
    } catch (error) {
      console.error(
        "History error:",
        error.response?.data ||
          error.message
      );

      // If token is invalid/expired
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    }
  };

  // =========================
  // START INTERVIEW
  // =========================

  const startInterview = async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      console.log(
        "Starting interview..."
      );

      const response = await axios.post(
        "http://localhost:5000/api/interviews/generate",
        {
          role,
          difficulty,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "Interview generated:",
        response.data
      );

      // Save generated interview
      localStorage.setItem(
        "currentInterview",
        JSON.stringify(
          response.data.interview
        )
      );

      // Go to interview page
      navigate("/interview");

    } catch (error) {
      console.error(
        "Interview generation error:",
        error.response?.data ||
          error.message
      );

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "user"
        );

        navigate("/login");
        return;
      }

      setError(
        error.response?.data?.message ||
          "Failed to generate interview"
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "currentInterview"
    );
    localStorage.removeItem(
      "completedInterview"
    );

    navigate("/login");
  };

  // =========================
  // STATISTICS
  // =========================

  const completedInterviews =
    interviews.filter(
      (item) => item.completed
    );

  const scores =
    completedInterviews.map(
      (item) => item.totalScore
    );

  const averageScore =
    scores.length > 0
      ? Math.round(
          scores.reduce(
            (total, score) =>
              total + score,
            0
          ) / scores.length
        )
      : 0;

  const bestScore =
    scores.length > 0
      ? Math.max(...scores)
      : 0;

  // =========================
  // DASHBOARD UI
  // =========================

  return (
    <div className="dashboard-page">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar">

        <div className="logo">
          AI Mock Interview
        </div>

        <div className="nav-right">

          <span>
            Hi,{" "}
            {user?.name || "User"}
          </span>

          <button
            className="logout-btn"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </nav>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="dashboard-container">

        {/* HERO */}

        <section className="hero">

          <h1>
            Welcome back,{" "}
            {user?.name || "User"} 👋
          </h1>

          <p>
            Continue improving your
            interview skills with
            AI-powered practice.
          </p>

        </section>

        {/* =========================
            STATISTICS
        ========================= */}

        <section className="stats-grid">

          <div className="stat-card">

            <span>
              Interviews Completed
            </span>

            <strong>
              {completedInterviews.length}
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Average Score
            </span>

            <strong>
              {averageScore}%
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Best Score
            </span>

            <strong>
              {bestScore}%
            </strong>

          </div>

        </section>

        {/* =========================
            START INTERVIEW
        ========================= */}

        <section className="interview-card">

          <h2>
            Start a Mock Interview
          </h2>

          <p>
            Choose your role and
            difficulty level to begin
            your AI-powered interview.
          </p>

          {/* ROLE */}

          <div className="form-group">

            <label>
              Interview Role
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value)
              }
            >

              <option>
                Java Developer
              </option>

              <option>
                Frontend Developer
              </option>

              <option>
                React Developer
              </option>

              <option>
                Full Stack Developer
              </option>

              <option>
                Backend Developer
              </option>

              <option>
                Software Engineer
              </option>

            </select>

          </div>

          {/* DIFFICULTY */}

          <div className="form-group">

            <label>
              Difficulty
            </label>

            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(
                  e.target.value
                )
              }
            >

              <option>
                Easy
              </option>

              <option>
                Medium
              </option>

              <option>
                Hard
              </option>

            </select>

          </div>

          {/* ERROR */}

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {/* START BUTTON */}

          <button
            className="start-btn"
            onClick={startInterview}
            disabled={loading}
          >
            {loading
              ? "Generating Questions..."
              : "Start Interview →"}
          </button>

        </section>

        {/* =========================
            INTERVIEW HISTORY
        ========================= */}

        <section className="history-section">

          <h2>
            Recent Interviews
          </h2>

          {interviews.length === 0 ? (

            <div className="empty-history">

              <p>
                No interviews completed
                yet.
              </p>

              <span>
                Start your first mock
                interview above.
              </span>

            </div>

          ) : (

            interviews
              .slice(0, 5)
              .map((interview) => (

                <div
                  className="history-card"
                  key={interview._id}
                >

                  {/* INTERVIEW INFO */}

                  <div>

                    <h3>
                      {interview.role}
                    </h3>

                    <p>
                      {interview.difficulty}
                      {" • "}
                      {new Date(
                        interview.createdAt
                      ).toLocaleDateString()}
                    </p>

                  </div>

                  {/* SCORE */}

                  <div className="history-score">

                    {interview.completed
                      ? `${interview.totalScore}/100`
                      : "In Progress"}

                  </div>

                </div>

              ))

          )}

        </section>

      </main>

    </div>
  );
}

export default Dashboard;