import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function SignUpPage() {
  const navigate = useNavigate();

  const handleSignUp = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/home");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="p-4">
      <h1 className="text-2xl mb-4">Sign Up</h1>
      <button
        onClick={handleSignUp}
        className="px-4 py-2 bg-green-500 text-white rounded"
      >
        Sign up with Google
      </button>
    </main>
  );
}
