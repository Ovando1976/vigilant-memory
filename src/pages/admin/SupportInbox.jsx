import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ArchiveIcon from "@mui/icons-material/Archive";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../components/SnackbarProvider";

const CATS = ["all", "rider", "driver", "payments", "app", "other"];
const SEVS = ["all", "low", "normal", "high", "urgent"];
const STATS = ["open", "in_progress", "resolved", "closed", "all"];

function StatusChip({ s }) {
  const map = {
    open: "default",
    in_progress: "warning",
    resolved: "success",
    closed: "info",
  };
  return <Chip size="small" color={map[s] ?? "default"} label={s} />;
}

export default function SupportInbox() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // filters
  const [qText, setQText] = useState("");
  const [cat, setCat] = useState("all");
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("open");

  // data + paging
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const lastDocRef = useRef(null);
  const unsubRef = useRef(() => {});

  const baseRef = useMemo(() => collection(db, "supportTickets"), []);
  const baseQuery = useMemo(() => {
    let q = query(baseRef, orderBy("createdAt", "desc"), limit(25));
    if (status !== "all") q = query(q, where("status", "==", status));
    if (cat !== "all") q = query(q, where("category", "==", cat));
    if (sev !== "all") q = query(q, where("severity", "==", sev));
    return q;
  }, [baseRef, status, cat, sev]);

  // live subscription (first page)
  useEffect(() => {
    setLoading(true);
    setRows([]);
    try {
      const unsub = onSnapshot(
        baseQuery,
        (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setRows(data);
          lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
          setLoading(false);
        },
        (e) => {
          console.error(e);
          enqueueSnackbar("Failed to load tickets", { variant: "error" });
          setLoading(false);
        }
      );
      unsubRef.current = unsub;
      return unsub;
    } catch (e) {
      setLoading(false);
      return () => {};
    }
  }, [baseQuery, enqueueSnackbar]);

  // load more (uses the same filters)
  const loadMore = async () => {
    if (!lastDocRef.current) return;
    setPaging(true);
    try {
      let q = baseQuery;
      q = query(q, startAfter(lastDocRef.current));
      const snap = await getDocs(q);
      const more = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRows((r) => [...r, ...more]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
    } catch (e) {
      enqueueSnackbar("Could not fetch more", { variant: "error" });
    } finally {
      setPaging(false);
    }
  };

  // quick text search (client side on subject/message/email)
  const visible = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.subject, r.message, r.email, r.uid]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(t))
    );
  }, [rows, qText]);

  const setTicketStatus = async (id, nextStatus) => {
    try {
      await updateDoc(doc(db, "supportTickets", id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });
      enqueueSnackbar(`Marked ${nextStatus}`, { variant: "success" });
    } catch (e) {
      enqueueSnackbar("Update failed", { variant: "error" });
    }
  };

  const addInternalNote = async (id, noteText) => {
    try {
      await addDoc(collection(db, "supportTickets", id, "notes"), {
        note: noteText,
        author: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      enqueueSnackbar("Note added", { variant: "success" });
    } catch (e) {
      enqueueSnackbar("Could not add note", { variant: "error" });
    }
  };

  // small inline note input
  const [noteFor, setNoteFor] = useState(null);
  const [noteText, setNoteText] = useState("");

  const resetFilters = () => {
    setCat("all");
    setSev("all");
    setStatus("open");
    setQText("");
  };

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
        >
          <Typography variant="h5" fontWeight={800} sx={{ flex: 1 }}>
            Admin • Support Inbox
          </Typography>
          <TextField
            label="Search"
            size="small"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Status"
            select
            size="small"
            sx={{ minWidth: 160 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Category"
            select
            size="small"
            sx={{ minWidth: 160 }}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {CATS.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Severity"
            select
            size="small"
            sx={{ minWidth: 160 }}
            value={sev}
            onChange={(e) => setSev(e.target.value)}
          >
            {SEVS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Reset filters">
            <IconButton onClick={resetFilters}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {loading ? (
          <Box p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>From</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((r) => {
                const when = r.createdAt?.toDate
                  ? r.createdAt.toDate()
                  : r.createdAt?._seconds
                  ? new Date(r.createdAt._seconds * 1000)
                  : null;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {when ? when.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>
                        {r.subject || "(no subject)"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        title={r.message}
                      >
                        {r.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.email || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.uid || "anon"}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.category || "—"}</TableCell>
                    <TableCell>{r.severity || "—"}</TableCell>
                    <TableCell>
                      <StatusChip s={r.status || "open"} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="In progress">
                        <IconButton
                          size="small"
                          onClick={() => setTicketStatus(r.id, "in_progress")}
                        >
                          <AssignmentTurnedInIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Resolved">
                        <IconButton
                          size="small"
                          onClick={() => setTicketStatus(r.id, "resolved")}
                        >
                          <DoneAllIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Closed">
                        <IconButton
                          size="small"
                          onClick={() => setTicketStatus(r.id, "closed")}
                        >
                          <ArchiveIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Open ticket doc">
                        <IconButton
                          size="small"
                          onClick={() =>
                            window.open(
                              `https://console.firebase.google.com/project/_/firestore/data/~2FsupportTickets~2F${r.id}`,
                              "_blank"
                            )
                          }
                        >
                          <OpenInNewIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Box display="flex" justifyContent="center" mt={2}>
          <Button onClick={loadMore} disabled={!lastDocRef.current || paging}>
            {paging ? "Loading…" : lastDocRef.current ? "Load more" : "No more"}
          </Button>
        </Box>

        {/* Inline note adder */}
        {noteFor && (
          <Box mt={2}>
            <Divider sx={{ my: 1 }} />
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems="center"
            >
              <TextField
                autoFocus
                fullWidth
                label={`Internal note for ${noteFor}`}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={async () => {
                  await addInternalNote(noteFor, noteText.trim());
                  setNoteText("");
                  setNoteFor(null);
                }}
                disabled={!noteText.trim()}
              >
                Add note
              </Button>
              <Button
                onClick={() => {
                  setNoteText("");
                  setNoteFor(null);
                }}
              >
                Cancel
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
