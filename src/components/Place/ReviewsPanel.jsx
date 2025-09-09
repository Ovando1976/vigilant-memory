import * as React from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  TextField,
  Rating,
  Avatar,
  Divider,
} from "@mui/material";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import RatingSummary from "./RatingSummary";
import { useAuth } from "../../context/AuthContext";

export default function ReviewsPanel({ placeId }) {
  const [reviews, setReviews] = React.useState([]);
  const [avg, setAvg] = React.useState(0);

  React.useEffect(() => {
    if (!placeId) return;
    const q = query(
      collection(db, "places", placeId, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setReviews(arr);
      const mean = arr.length
        ? arr.reduce((s, r) => s + Number(r.rating || 0), 0) / arr.length
        : 0;
      setAvg(mean);
    });
    return unsub;
  }, [placeId]);

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems="flex-start"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800}>
              Reviews
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </Typography>
            <RatingSummary reviews={reviews} average={avg} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ReviewComposer placeId={placeId} />
          </div>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          {reviews.map((r) => (
            <Stack
              key={r.id}
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
            >
              <Avatar sx={{ bgcolor: "primary.main" }}>
                {(r.userName || "?").slice(0, 1).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.25 }}
                >
                  <Typography
                    fontWeight={700}
                    noWrap
                    title={r.userName || "Visitor"}
                  >
                    {r.userName || "Visitor"}
                  </Typography>
                  <Rating
                    size="small"
                    value={Number(r.rating) || 0}
                    precision={0.5}
                    readOnly
                  />
                </Stack>
                {r.title && <Typography fontWeight={700}>{r.title}</Typography>}
                {r.text && (
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {r.text}
                  </Typography>
                )}
                {r.createdAt?.toDate && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    {r.createdAt.toDate().toLocaleString()}
                  </Typography>
                )}
              </div>
            </Stack>
          ))}
          {reviews.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Be the first to write a review.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReviewComposer({ placeId }) {
  const { user } = useAuth();
  const [rating, setRating] = React.useState(5);
  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");

  const canPost = !!user;

  const submit = async () => {
    if (!canPost || !placeId) return;
    await addDoc(collection(db, "places", placeId, "reviews"), {
      userId: user.uid,
      userName: user.displayName || "Visitor",
      rating: Number(rating) || 0,
      title: title.trim(),
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    setTitle("");
    setText("");
    setRating(5);
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
          Write a review
        </Typography>
        <Stack spacing={1}>
          <Rating value={rating} onChange={(e, v) => setRating(v || 5)} />
          <TextField
            label="Title (optional)"
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Your experience"
            multiline
            minRows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={submit}
            disabled={!canPost || !text.trim()}
          >
            {canPost ? "Post review" : "Sign in to review"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
