import Link from "next/link";

const highlights = [
  ["01", "Academic clarity", "Sessions, terms, classes, subjects, results and report cards in one calm workspace."],
  ["02", "Family connection", "Give parents and students timely access to attendance, fees, assignments and announcements."],
  ["03", "Built for Nigeria", "Naira-first fees, Africa/Lagos time, Paystack-ready payments and low-bandwidth screens."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-[#12233f]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="Learnzy Hub home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#176b5b] text-lg font-bold text-white">L</span>
          <span className="text-xl font-bold tracking-tight">Learnzy Hub</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-[#52627a] md:flex">
          <a href="#features" className="transition hover:text-[#176b5b]">Platform</a>
          <a href="#about" className="transition hover:text-[#176b5b]">Why Learnzy Hub</a>
          <a href="#contact" className="transition hover:text-[#176b5b]">Contact</a>
        </div>
        <a href="/login" className="rounded-full bg-[#12233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#176b5b]">Portal login</a>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-20">
        <div>
          <p className="mb-6 inline-flex rounded-full border border-[#c9e4dc] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#176b5b]">School operations, simplified</p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">A better school day starts with <span className="text-[#176b5b]">better systems.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#52627a]">Learnzy Hub helps schools run academics, people, attendance, communication and fees from one dependable place.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="/admissions" className="rounded-full bg-[#176b5b] px-6 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-[#176b5b]/20 transition hover:bg-[#125646]">Start an application</a>
            <a href="#features" className="rounded-full border border-[#d6deea] bg-white px-6 py-4 text-center text-sm font-semibold text-[#12233f] transition hover:border-[#176b5b]">Explore the platform</a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#dff2e9] blur-2xl" aria-hidden="true" />
          <div className="relative rounded-[2rem] bg-[#12233f] p-4 shadow-2xl shadow-[#12233f]/20 sm:p-6">
            <div className="rounded-[1.4rem] bg-[#f7f9fc] p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-[#e5eaf1] pb-5">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-[#8491a5]">Overview</p><p className="mt-1 text-xl font-bold">Good morning, Admin</p></div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#dff2e9] text-sm font-bold text-[#176b5b]">AD</span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
                {[["524", "Students"], ["38", "Staff"], ["94%", "Attendance"], ["₦8.4m", "Collected"]].map(([value, label]) => <div key={label} className="rounded-xl bg-white p-3"><p className="text-lg font-bold">{value}</p><p className="mt-1 text-[11px] text-[#8491a5]">{label}</p></div>)}
              </div>
              <div className="rounded-xl bg-white p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-bold">Attendance this week</p><span className="text-xs text-[#176b5b]">+4.2%</span></div>
                <div className="mt-5 flex h-24 items-end gap-2">{[38, 53, 46, 70, 61, 82, 74].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-[#8ed1bc]" style={{ height: `${height}%` }} />)}</div>
                <div className="mt-2 flex justify-between text-[10px] text-[#8491a5]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#e5eaf1] bg-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 lg:grid-cols-3 lg:px-10">
          {highlights.map(([number, title, copy]) => <article key={number} className="border-b border-[#e5eaf1] py-8 lg:border-b-0 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0"><span className="text-xs font-bold tracking-widest text-[#176b5b]">{number}</span><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-3 max-w-sm text-sm leading-7 text-[#52627a]">{copy}</p></article>)}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-5 py-20 lg:px-10"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-widest text-[#176b5b]">Designed for the whole school</p><h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">One connected view of every learner.</h2><p className="mt-5 text-lg leading-8 text-[#52627a]">From admission to graduation, Learnzy Hub brings the people and information that matter together—without making the day harder.</p></div></section>

      <footer id="contact" className="bg-[#12233f] px-5 py-8 text-sm text-[#c5d0df]"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row lg:px-10"><p>© 2026 Learnzy Hub. Built for ambitious schools.</p><p>Africa/Lagos · Nigerian Naira</p></div></footer>
    </main>
  );
}
