import { NextResponse } from "next/server";
import { ReportCategory } from "@prisma/client";

export async function GET() {
  try {
    const categoryValues = Object.values(ReportCategory);

    const formattedCategories = categoryValues.map((cat) => ({
      id: cat,

      label: cat.charAt(0) + cat.slice(1).toLowerCase().replace(/_/g, " ")
    }));

    return NextResponse.json(formattedCategories);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal memuat kategori" },
      { status: 500 }
    );
  }
}
