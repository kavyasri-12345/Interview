import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Interview() {
  const navigate = useNavigate();

  const interview = JSON.parse(
    localStorage.getItem("currentInterview") || "null"
  );

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState(
    Array(interview?.questions?.length || 0).fill("")
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // =========================================
  // CAMERA / MICROPHONE
  // =========================================

  const [cameraOn, setCameraOn] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);

  // =========================================
  // RECORDING
  // =========================================

  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // =========================================
  // QUESTION SPEECH
  // =========================================

  const [speakingQuestion, setSpeakingQuestion] = useState(false);

  // =========================================
  // REFS
  // =========================================

  const videoRef = useRef(null);

  const mediaStreamRef = useRef(null);

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const recordingAudioStreamRef = useRef(null);

  // =========================================
  // NO INTERVIEW
  // =========================================

  if (!interview) {
    return (
      <div className="results-page">
        <div className="no-results-card">
          <h1>No Interview Found</h1>

          <p>Please start an interview from the dashboard.</p>

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

  const question = interview.questions[currentQuestion];

  const totalQuestions = interview.questions.length;

  const progress =
    ((currentQuestion + 1) / totalQuestions) * 100;

  // =========================================
  // CLEANUP
  // =========================================

  useEffect(() => {
    return () => {
      console.log("Cleaning up interview media...");

      // Stop recorder
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.log("Recorder cleanup error:", error);
        }
      }

      // Stop cloned recording audio stream
      if (recordingAudioStreamRef.current) {
        recordingAudioStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        recordingAudioStreamRef.current = null;
      }

      // Stop camera + microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        mediaStreamRef.current = null;
      }

      // Stop video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      // Stop question speech
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // =========================================
  // START CAMERA + MICROPHONE
  // =========================================

  const startMedia = async () => {
    if (mediaLoading) return;

    setMediaLoading(true);
    setError("");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Your browser does not support camera and microphone access."
        );
      }

      // Stop old stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        mediaStreamRef.current = null;
      }

      console.log("Requesting camera + microphone...");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "user",
          },

          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      console.log("Media stream received:", stream);

      mediaStreamRef.current = stream;

      // =========================================
      // CAMERA TRACK
      // =========================================

      const videoTracks = stream.getVideoTracks();

      console.log("Video tracks:", videoTracks);

      if (videoTracks.length === 0) {
        throw new Error("No camera video track was found.");
      }

      videoTracks.forEach((track) => {
        track.enabled = true;

        console.log("Camera track:", {
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
        });
      });

      // =========================================
      // MICROPHONE TRACK
      // =========================================

      const audioTracks = stream.getAudioTracks();

      console.log("Audio tracks:", audioTracks);

      if (audioTracks.length === 0) {
        throw new Error("No microphone audio track was found.");
      }

      audioTracks.forEach((track) => {
        track.enabled = true;

        console.log("Microphone track:", {
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
        });
      });

      setCameraOn(true);
      setMicrophoneOn(true);

      // =========================================
      // ATTACH CAMERA
      // =========================================

      if (videoRef.current) {
        const video = videoRef.current;

        video.srcObject = stream;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
          try {
            await video.play();

            console.log("Camera video playing.");
          } catch (error) {
            console.error("Video play error:", error);
          }
        };

        if (video.readyState >= 1) {
          try {
            await video.play();
          } catch (error) {
            console.log("Video play waiting:", error);
          }
        }
      }

      console.log("Camera and microphone are ready.");
    } catch (error) {
      console.error("MEDIA ERROR:", error);

      setCameraOn(false);
      setMicrophoneOn(false);

      if (error.name === "NotAllowedError") {
        setError(
          "Camera/microphone permission was blocked. Click the camera icon in the Edge address bar and set Camera and Microphone to Allow."
        );
      } else if (error.name === "NotFoundError") {
        setError(
          "Camera or microphone was not found. Check that your webcam and microphone are connected."
        );
      } else if (error.name === "NotReadableError") {
        setError(
          "Camera or microphone is being used by another application. Close Camera, Teams, Zoom, Google Meet, etc."
        );
      } else {
        setError(
          error.message ||
            "Could not access camera and microphone."
        );
      }
    } finally {
      setMediaLoading(false);
    }
  };

  // =========================================
  // STOP CAMERA + MICROPHONE
  // =========================================

  const stopMedia = () => {
    console.log("Stopping camera and microphone...");

    // Stop recording first
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.log("Recorder stop error:", error);
      }
    }

    mediaRecorderRef.current = null;

    // Stop cloned recording stream
    if (recordingAudioStreamRef.current) {
      recordingAudioStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      recordingAudioStreamRef.current = null;
    }

    // Stop main camera + microphone stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => {
          console.log(
            "Stopping:",
            track.kind,
            track.label
          );

          track.stop();
        });

      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setMicrophoneOn(false);
    setListening(false);
  };

  // =========================================
  // CAMERA TOGGLE
  // =========================================

  const toggleCamera = async () => {
    if (!mediaStreamRef.current) {
      await startMedia();
      return;
    }

    const videoTracks =
      mediaStreamRef.current.getVideoTracks();

    if (videoTracks.length === 0) {
      setError("No camera was found.");
      return;
    }

    const newCameraState = !cameraOn;

    videoTracks.forEach((track) => {
      track.enabled = newCameraState;
    });

    setCameraOn(newCameraState);

    console.log(
      "Camera:",
      newCameraState ? "ON" : "OFF"
    );

    if (
      newCameraState &&
      videoRef.current
    ) {
      videoRef.current.srcObject =
        mediaStreamRef.current;

      try {
        await videoRef.current.play();
      } catch (error) {
        console.log(
          "Camera play error:",
          error
        );
      }
    }
  };

  // =========================================
  // MICROPHONE TOGGLE
  // =========================================

  const toggleMicrophone = () => {
    if (!mediaStreamRef.current) {
      startMedia();
      return;
    }

    const audioTracks =
      mediaStreamRef.current.getAudioTracks();

    if (audioTracks.length === 0) {
      setError("No microphone was found.");
      return;
    }

    const newMicrophoneState =
      !microphoneOn;

    audioTracks.forEach((track) => {
      track.enabled =
        newMicrophoneState;
    });

    setMicrophoneOn(
      newMicrophoneState
    );

    console.log(
      "Microphone:",
      newMicrophoneState
        ? "ON"
        : "OFF"
    );

    if (!newMicrophoneState) {
      stopListening();
    }
  };

  // =========================================
  // SPEAK QUESTION
  // =========================================

  const speakQuestion = () => {
    if (!("speechSynthesis" in window)) {
      setError(
        "Voice playback is not supported by this browser."
      );

      return;
    }

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(
        question.question
      );

    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onstart = () => {
      setSpeakingQuestion(true);
    };

    speech.onend = () => {
      setSpeakingQuestion(false);
    };

    speech.onerror = () => {
      setSpeakingQuestion(false);
    };

    window.speechSynthesis.speak(speech);
  };

  // =========================================
  // UPDATE ANSWER
  // =========================================

  const updateAnswer = (value) => {
    const updatedAnswers = [...answers];

    updatedAnswers[currentQuestion] =
      value;

    setAnswers(updatedAnswers);
  };

  // =========================================
  // TRANSCRIBE AUDIO
  // =========================================

  const transcribeRecordedAudio = async (
    audioBlob
  ) => {
    setTranscribing(true);
    setError("");

    try {
      console.log(
        "Sending audio for transcription..."
      );

      console.log(
        "Audio type:",
        audioBlob.type
      );

      console.log(
        "Audio size:",
        audioBlob.size
      );

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const formData = new FormData();

      let extension = "webm";

      if (
        audioBlob.type.includes("mp4")
      ) {
        extension = "mp4";
      }

      formData.append(
        "audio",
        audioBlob,
        `answer.${extension}`
      );

      const response =
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/interviews/transcribe`,
          formData,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      console.log(
        "Transcription response:",
        response.data
      );

      const transcript =
        response.data?.transcript?.trim();

      if (!transcript) {
        throw new Error(
          "No speech was detected in the recording."
        );
      }

      // Add transcript to existing answer
      const existingAnswer =
        answers[currentQuestion] || "";

      const updatedAnswer =
        existingAnswer.trim()
          ? `${existingAnswer.trim()} ${transcript}`
          : transcript;

      updateAnswer(updatedAnswer);

      console.log(
        "Transcript added:",
        transcript
      );
    } catch (error) {
      console.error(
        "TRANSCRIPTION ERROR:",
        error
      );

      console.error(
        "Server response:",
        error.response?.data
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to convert speech to text."
      );
    } finally {
      setTranscribing(false);
    }
  };

  // =========================================
  // START LISTENING / RECORDING
  // =========================================

  const startListening = async () => {
    setError("");

    console.log(
      "Starting microphone recording..."
    );

    try {
      // =========================================
      // MAKE SURE MEDIA EXISTS
      // =========================================

      if (!mediaStreamRef.current) {
        await startMedia();
      }

      const stream =
        mediaStreamRef.current;

      if (!stream) {
        throw new Error(
          "Microphone stream is not available."
        );
      }

      // =========================================
      // GET MICROPHONE TRACK
      // =========================================

      const audioTracks =
        stream.getAudioTracks();

      console.log(
        "Available audio tracks:",
        audioTracks
      );

      if (audioTracks.length === 0) {
        throw new Error(
          "No microphone audio track was found."
        );
      }

      const microphoneTrack =
        audioTracks[0];

      if (
        microphoneTrack.readyState !==
        "live"
      ) {
        throw new Error(
          "Microphone track is not active. Please turn the microphone off and on again."
        );
      }

      microphoneTrack.enabled = true;

      setMicrophoneOn(true);

      console.log(
        "Microphone track ready:",
        {
          label:
            microphoneTrack.label,
          readyState:
            microphoneTrack.readyState,
          enabled:
            microphoneTrack.enabled,
        }
      );

      // =========================================
      // CHECK MEDIA RECORDER
      // =========================================

      if (
        typeof MediaRecorder ===
        "undefined"
      ) {
        throw new Error(
          "MediaRecorder is not supported by this browser."
        );
      }

      // =========================================
      // CREATE AUDIO-ONLY STREAM
      // =========================================
      //
      // IMPORTANT:
      // Do NOT pass the complete camera stream
      // to MediaRecorder.
      //
      // We clone only the microphone track.
      // This makes the recording audio-only.
      //

      const clonedAudioTrack =
        microphoneTrack.clone();

      const audioStream =
        new MediaStream([
          clonedAudioTrack,
        ]);

      recordingAudioStreamRef.current =
        audioStream;

      console.log(
        "Audio-only recording stream created."
      );

      // =========================================
      // FIND SUPPORTED MIME TYPE
      // =========================================

      let mimeType = "";

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      for (
        const type of supportedTypes
      ) {
        try {
          if (
            MediaRecorder.isTypeSupported(
              type
            )
          ) {
            mimeType = type;
            break;
          }
        } catch (error) {
          console.log(
            "MIME check failed:",
            type,
            error
          );
        }
      }

      console.log(
        "Selected recording MIME type:",
        mimeType || "browser default"
      );

      // =========================================
      // CREATE MEDIA RECORDER
      // =========================================

      let recorder;

      try {
        if (mimeType) {
          recorder =
            new MediaRecorder(
              audioStream,
              {
                mimeType,
              }
            );
        } else {
          recorder =
            new MediaRecorder(
              audioStream
            );
        }
      } catch (error) {
        console.error(
          "MediaRecorder creation error:",
          error
        );

        throw new Error(
          `Browser could not create the audio recorder. ${
            error.message || ""
          }`
        );
      }

      console.log(
        "MediaRecorder created:",
        recorder
      );

      mediaRecorderRef.current =
        recorder;

      audioChunksRef.current = [];

      // =========================================
      // AUDIO DATA
      // =========================================

      recorder.ondataavailable = (
        event
      ) => {
        console.log(
          "Audio data received:",
          event.data?.size
        );

        if (
          event.data &&
          event.data.size > 0
        ) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      // =========================================
      // RECORDING STARTED
      // =========================================

      recorder.onstart = () => {
        console.log(
          "🔴 RECORDING STARTED"
        );

        setListening(true);
        setError("");
      };

      // =========================================
      // RECORDING STOPPED
      // =========================================

      recorder.onstop = async () => {
        console.log(
          "⏹ RECORDING STOPPED"
        );

        setListening(false);

        const actualMimeType =
          recorder.mimeType ||
          mimeType ||
          "audio/webm";

        console.log(
          "Actual recording type:",
          actualMimeType
        );

        const audioBlob =
          new Blob(
            audioChunksRef.current,
            {
              type: actualMimeType,
            }
          );

        console.log(
          "Final audio size:",
          audioBlob.size
        );

        // Stop cloned audio track
        if (
          recordingAudioStreamRef.current
        ) {
          recordingAudioStreamRef.current
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          recordingAudioStreamRef.current =
            null;
        }

        mediaRecorderRef.current =
          null;

        if (audioBlob.size === 0) {
          setError(
            "No audio was recorded. Please speak clearly and try again."
          );

          return;
        }

        await transcribeRecordedAudio(
          audioBlob
        );
      };

      // =========================================
      // RECORDING ERROR
      // =========================================

      recorder.onerror = (event) => {
        console.error(
          "MEDIA RECORDER ERROR:",
          event
        );

        setListening(false);

        if (
          recordingAudioStreamRef.current
        ) {
          recordingAudioStreamRef.current
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          recordingAudioStreamRef.current =
            null;
        }

        mediaRecorderRef.current =
          null;

        setError(
          "There was a problem recording your answer."
        );
      };

      // =========================================
      // START RECORDING
      // =========================================

      console.log(
        "Calling recorder.start()..."
      );

      recorder.start(250);

      console.log(
        "🎤 recorder.start() successful"
      );
    } catch (error) {
      console.error(
        "MICROPHONE RECORDING ERROR:",
        error
      );

      console.error(
        "Error name:",
        error?.name
      );

      console.error(
        "Error message:",
        error?.message
      );

      setListening(false);

      // Clean cloned stream
      if (
        recordingAudioStreamRef.current
      ) {
        recordingAudioStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        recordingAudioStreamRef.current =
          null;
      }

      mediaRecorderRef.current =
        null;

      setError(
        error?.message ||
          "Could not start microphone recording."
      );
    }
  };

  // =========================================
  // STOP LISTENING
  // =========================================

  const stopListening = () => {
    console.log(
      "Stopping microphone recording..."
    );

    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      try {
        recorder.stop();
      } catch (error) {
        console.error(
          "Stop recorder error:",
          error
        );

        setListening(false);
      }

      return;
    }

    setListening(false);
  };

  // =========================================
  // TEXT ANSWER
  // =========================================

  const handleTextAnswer = (e) => {
    updateAnswer(e.target.value);
  };

  // =========================================
  // NEXT QUESTION
  // =========================================

  const nextQuestion = () => {
    if (listening || transcribing) {
      setError(
        "Please stop recording and wait for the speech conversion to finish."
      );

      return;
    }

    if (!answers[currentQuestion]?.trim()) {
      setError(
        "Please provide an answer before continuing."
      );

      return;
    }

    setError("");

    window.speechSynthesis.cancel();

    const nextIndex =
      currentQuestion + 1;

    if (
      nextIndex <
      totalQuestions
    ) {
      setCurrentQuestion(
        nextIndex
      );
    }
  };

  // =========================================
  // PREVIOUS QUESTION
  // =========================================

  const previousQuestion = () => {
    if (listening || transcribing) {
      setError(
        "Please stop recording and wait for the speech conversion to finish."
      );

      return;
    }

    setError("");

    window.speechSynthesis.cancel();

    const previousIndex =
      currentQuestion - 1;

    if (previousIndex >= 0) {
      setCurrentQuestion(
        previousIndex
      );
    }
  };

  // =========================================
  // FINISH INTERVIEW
  // =========================================

  const finishInterview = async () => {
    if (listening) {
      setError(
        "Please stop recording before submitting the interview."
      );

      return;
    }

    if (transcribing) {
      setError(
        "Please wait until your speech is converted to text."
      );

      return;
    }

    if (!answers[currentQuestion]?.trim()) {
      setError(
        "Please provide an answer before submitting."
      );

      return;
    }

    setSubmitting(true);
    setError("");

    window.speechSynthesis.cancel();

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const response =
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/interviews/evaluate`,
          {
            interviewId:
              interview._id,
            answers,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      localStorage.setItem(
        "completedInterview",
        JSON.stringify(
          response.data.interview
        )
      );

      stopMedia();

      navigate("/results");
    } catch (error) {
      console.error(
        "Evaluation error:",
        error.response?.data ||
          error.message
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to evaluate interview."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentAnswer =
    answers[currentQuestion] || "";

  // =========================================
  // UI
  // =========================================

  return (
    <div className="voice-interview-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="voice-interview-header">

        <div>

          <div className="voice-brand">
            AI Mock Interview
          </div>

          <h1>
            {interview.role}
          </h1>

          <p>
            {interview.difficulty} Interview
          </p>

        </div>

        <div className="question-counter">
          Question{" "}
          {currentQuestion + 1} of{" "}
          {totalQuestions}
        </div>

      </header>

      {/* =========================================
          PROGRESS
      ========================================= */}

      <div className="voice-progress-wrapper">

        <div className="voice-progress-bar">

          <div
            className="voice-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        <span>
          {Math.round(progress)}%
        </span>

      </div>

      {/* =========================================
          MAIN
      ========================================= */}

      <main className="voice-interview-container">

        {/* =========================================
            CAMERA
        ========================================= */}

        <section className="camera-card">

          <div className="camera-header">

            <h2>
              Interview Camera
            </h2>

            <span
              className={
                cameraOn
                  ? "status-online"
                  : "status-offline"
              }
            >
              {cameraOn
                ? "● Live"
                : "● Off"}
            </span>

          </div>

          {/* CAMERA PREVIEW */}

          <div className="camera-preview">

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                display: cameraOn
                  ? "block"
                  : "none",

                width: "100%",
                height: "100%",

                objectFit: "cover",

                transform:
                  "scaleX(-1)",
              }}
              onCanPlay={(e) => {
                e.currentTarget
                  .play()
                  .catch((error) => {
                    console.log(
                      "Video play error:",
                      error
                    );
                  });
              }}
            />

            {!cameraOn && (
              <div className="camera-off">

                <span>
                  📷
                </span>

                <p>
                  Camera is off
                </p>

              </div>
            )}

          </div>

          {/* MEDIA BUTTONS */}

          <div className="media-controls">

            <button
              className={
                cameraOn
                  ? "media-btn active"
                  : "media-btn"
              }
              onClick={toggleCamera}
              disabled={mediaLoading}
            >
              {cameraOn
                ? "📷 Camera On"
                : "📷 Camera Off"}
            </button>

            <button
              className={
                microphoneOn
                  ? "media-btn active"
                  : "media-btn"
              }
              onClick={
                toggleMicrophone
              }
              disabled={mediaLoading}
            >
              {microphoneOn
                ? "🎤 Mic On"
                : "🎤 Mic Off"}
            </button>

          </div>

          {/* ENABLE BUTTON */}

          {!cameraOn ||
          !microphoneOn ? (
            <button
              className="enable-media-btn"
              onClick={startMedia}
              disabled={mediaLoading}
            >
              {mediaLoading
                ? "Requesting Permissions..."
                : "Enable Camera & Microphone"}
            </button>
          ) : null}

        </section>

        {/* =========================================
            QUESTION
        ========================================= */}

        <section className="question-area">

          <div className="question-card-new">

            <div className="question-top">

              <span>
                Question{" "}
                {currentQuestion + 1}
              </span>

              <span>
                {interview.difficulty}
              </span>

            </div>

            <h2>
              {question.question}
            </h2>

            <button
              className="speak-question-btn"
              onClick={
                speakQuestion
              }
              disabled={
                speakingQuestion
              }
            >
              {speakingQuestion
                ? "🔊 Speaking..."
                : "🔊 Hear Question"}
            </button>

          </div>

          {/* =========================================
              ANSWER
          ========================================= */}

          <div className="voice-answer-card">

            <div className="voice-answer-header">

              <div>

                <h3>
                  Your Answer
                </h3>

                <p>
                  Speak your answer or
                  type it below.
                </p>

              </div>

              {listening && (
                <span className="listening-indicator">
                  ● Recording
                </span>
              )}

              {transcribing && (
                <span className="listening-indicator">
                  ● Converting Speech
                </span>
              )}

            </div>

            {/* VOICE CONTROLS */}

            <div className="voice-controls">

              {transcribing ? (
                <button
                  className="stop-speaking-btn"
                  disabled
                >
                  ⏳ Converting Speech...
                </button>
              ) : !listening ? (
                <button
                  className="start-speaking-btn"
                  onClick={
                    startListening
                  }
                  disabled={
                    !microphoneOn ||
                    submitting
                  }
                >
                  🎤 Start Answer
                </button>
              ) : (
                <button
                  className="stop-speaking-btn"
                  onClick={
                    stopListening
                  }
                >
                  ⏹ Stop Recording
                </button>
              )}

            </div>

            {/* TEXTAREA */}

            <textarea
              className="voice-answer-textarea"
              placeholder={
                transcribing
                  ? "Converting your speech to text..."
                  : listening
                  ? "Recording... speak your answer..."
                  : "Your transcribed answer will appear here. You can also type your answer."
              }
              value={currentAnswer}
              onChange={
                handleTextAnswer
              }
              disabled={
                transcribing
              }
            />

            <div className="answer-info">
              {currentAnswer.length}{" "}
              characters
            </div>

          </div>

          {/* =========================================
              ERROR
          ========================================= */}

          {error && (
            <div className="voice-error">
              {error}
            </div>
          )}

          {/* =========================================
              NAVIGATION
          ========================================= */}

          <div className="voice-question-actions">

            <button
              className="previous-question-btn"
              onClick={
                previousQuestion
              }
              disabled={
                currentQuestion === 0 ||
                listening ||
                transcribing
              }
            >
              ← Previous
            </button>

            {currentQuestion ===
            totalQuestions - 1 ? (
              <button
                className="finish-interview-btn"
                onClick={
                  finishInterview
                }
                disabled={
                  submitting ||
                  listening ||
                  transcribing
                }
              >
                {submitting
                  ? "Evaluating..."
                  : "Submit Interview ✓"}
              </button>
            ) : (
              <button
                className="next-question-btn"
                onClick={
                  nextQuestion
                }
                disabled={
                  listening ||
                  transcribing
                }
              >
                Next Question →
              </button>
            )}

          </div>

        </section>

      </main>

    </div>
  );
}

export default Interview;