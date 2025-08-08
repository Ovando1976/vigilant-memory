import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function SignInPage() {
  const navigate = useNavigate();

  const handleSignIn = async () => {
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
      <h1 className="text-2xl mb-4">Sign In</h1>
      <button
        onClick={handleSignIn}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Sign in with Google
      </button>
    </main>
  );
}
