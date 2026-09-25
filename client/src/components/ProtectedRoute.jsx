import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  console.log(
    "ProtectedRoute token:",
    token
  );

  if (!token) {
    console.log(
      "No token → redirecting to LOGIN"
    );

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;