import { FileText } from "lucide-react";

export default function ReportsLoading() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F8F7F3] px-4 py-8 text-[#374375] sm:px-6"
    >
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BABDE2]/30">
            <FileText />
          </div>
          <div className="space-y-3">
            <div className="h-8 w-56 rounded-xl bg-[#BABDE2]/30" />
            <div className="h-4 w-72 rounded-lg bg-gray-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-3xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="mt-6 h-40 rounded-[2rem] bg-white shadow-sm" />
        <div className="mt-6 h-80 rounded-[2rem] bg-white shadow-sm" />
      </div>
    </main>
  );
}
