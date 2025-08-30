export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ msg: "Server running on Vercel 🚀" });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
