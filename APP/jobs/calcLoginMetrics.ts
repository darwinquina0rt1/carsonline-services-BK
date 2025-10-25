import fetch from "node-fetch";
import mongoose from "mongoose";

(async () => {

 
  const SessionLogSchema = new mongoose.Schema({
    userId: String,
    username: String,
    email: String,
    role: String,
    status: String,
    message: String,
    ipAddress: String,
    userAgent: String,
    latencyMs: Number,
    createdAt: { type: Date, default: Date.now },
  });

  const SessionLog =
    mongoose.models.SessionLog || mongoose.model("SessionLog", SessionLogSchema);

  async function calcLoginMetrics() {
    if (mongoose.connection.readyState === 0) return;

    const end = new Date();
    const start = new Date(end.getTime() - 60_000);

    const data = await SessionLog.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$ipAddress",
          total: { $sum: 1 },
          fails: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          users: { $addToSet: "$username" },
          avgLatency: { $avg: "$latencyMs" },
        },
      },
    ]);

    const metrics = data.map((d) => ({
      ip: d._id,
      reqPerMin: d.total,
      failRatio: d.total ? d.fails / d.total : 0,
      uniqueUsers: d.users.length,
      avgLatency: d.avgLatency || 0,
    }));

    console.log("Métricas generadas:", metrics);

    try {
      const trainRes = await fetch("http://127.0.0.1:5050/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      });

      const trainResult = await trainRes.json();
    } catch (err) {
      console.error("Error al entrenar modelo ML:", err.message);
    }

    
  }

  setInterval(async () => {
    try {
      await calcLoginMetrics();
    } catch (err) {
      console.error("Error calculando métricas:", err);
    }
  }, 60_000);

  await calcLoginMetrics();
})();
