import { Types } from "mongoose";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { Visit } from "@/models/Visit";
import { startOfTodayIST } from "@/lib/time";

const IST_MS = 5.5 * 60 * 60 * 1000;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function toISTDateStr(date: Date): string {
  const ist = new Date(date.getTime() + IST_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
}

export const GET = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // "YYYY-MM"

  if (monthParam) {
    const [year, month] = monthParam.split("-").map(Number);
    // IST midnight on 1st of month expressed as UTC
    const monthStartIST = new Date(Date.UTC(year, month - 1, 1) - IST_MS);
    const monthEndIST = new Date(Date.UTC(year, month, 1) - IST_MS);

    // Standard $lookup (no pipeline option) — works on MongoDB 3.2+.
    // Using $arrayElemAt instead of $unwind avoids dropping visits whose
    // patient record was purged.
    const visits = await Visit.aggregate<{
      confirmedAt: Date;
      fees: number;
      patientName: string;
    }>([
      {
        $match: {
          doctorId: new Types.ObjectId(doctorId),
          status: "confirmed",
          confirmedAt: { $gte: monthStartIST, $lt: monthEndIST },
          // No fees filter — show all confirmed patients, just like billing does
        },
      },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patient",
        },
      },
      {
        $project: {
          confirmedAt: 1,
          fees: { $ifNull: ["$fees", 0] },
          patientName: {
            $ifNull: [{ $arrayElemAt: ["$patient.name", 0] }, "Patient (removed)"],
          },
        },
      },
      { $sort: { confirmedAt: 1 } },
    ]);

    type DayEntry = {
      date: string;
      label: string;
      total: number;
      count: number;
      visits: Array<{ index: number; patientName: string; fees: number }>;
    };

    const dayMap = new Map<string, DayEntry>();
    for (const v of visits) {
      const dateStr = toISTDateStr(v.confirmedAt);
      if (!dayMap.has(dateStr)) {
        const d = new Date(dateStr + "T12:00:00Z");
        const label = `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}, ${DAY_NAMES[d.getUTCDay()]}`;
        dayMap.set(dateStr, { date: dateStr, label, total: 0, count: 0, visits: [] });
      }
      const day = dayMap.get(dateStr)!;
      day.visits.push({
        index: day.visits.length + 1,
        patientName: v.patientName,
        fees: v.fees,
      });
      day.total += v.fees;
      day.count++;
    }

    // Newest day first
    const days = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    return jsonOk({ days });
  }

  // Month summaries + today/this-month quick stats.
  // Count ALL confirmed visits (matching billing), sum whatever fees are set.
  const now = new Date();
  const todayStart = startOfTodayIST(now);
  const tomorrow = new Date(todayStart.getTime() + 86_400_000);

  const [monthAgg, todayAgg] = await Promise.all([
    Visit.aggregate<{ _id: { year: number; month: number }; total: number; count: number }>([
      {
        $match: {
          doctorId: new Types.ObjectId(doctorId),
          status: "confirmed",
          confirmedAt: { $exists: true },
        },
      },
      {
        $addFields: {
          confirmedAtIST: { $add: ["$confirmedAt", IST_MS] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$confirmedAtIST" },
            month: { $month: "$confirmedAtIST" },
          },
          total: { $sum: { $ifNull: ["$fees", 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]),
    Visit.aggregate<{ total: number; count: number }>([
      {
        $match: {
          doctorId: new Types.ObjectId(doctorId),
          status: "confirmed",
          confirmedAt: { $gte: todayStart, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$fees", 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const nowIST = new Date(now.getTime() + IST_MS);
  const currentYM = `${nowIST.getUTCFullYear()}-${String(nowIST.getUTCMonth() + 1).padStart(2, "0")}`;

  const months = monthAgg.map((m) => {
    const ym = `${m._id.year}-${String(m._id.month).padStart(2, "0")}`;
    return {
      month: ym,
      label: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
      total: m.total,
      count: m.count,
    };
  });

  const thisMonthData = months.find((m) => m.month === currentYM);

  return jsonOk({
    months,
    todayTotal: todayAgg[0]?.total ?? 0,
    todayCount: todayAgg[0]?.count ?? 0,
    thisMonthTotal: thisMonthData?.total ?? 0,
    thisMonthCount: thisMonthData?.count ?? 0,
  });
});
