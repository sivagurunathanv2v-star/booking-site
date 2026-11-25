import { useEffect, useState } from "react";
import { ArrowUpRight, Linkedin } from "lucide-react";
import {
  EXTRACTED_TEAM_SECTION,
  type ExtractedTeamMember,
} from "../data/extractedV2VData";

function MemberCard({ member }: { member: ExtractedTeamMember }) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = member.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-center bg-[#F3F5F0] px-5 pt-5 pb-3">
        <div className="aspect-[2/3] w-full max-w-[260px] overflow-hidden rounded-xl border border-[#DDE3D8] bg-[#FFFFFF]">
          {!imgFailed ? (
            <img
              src={member.image}
              alt={member.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-contain object-center transition-transform duration-300 ease-out hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#E7EFE9] text-2xl font-semibold text-[#15663E]">
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold text-[#15663E]">{member.role}</p>
        <h3
          className="mt-1.5 text-xl font-semibold tracking-tight text-[#132219]"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {member.name}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-[#4A5D51]">{member.bio}</p>

        {member.linkedin && (
          <div className="mt-5 border-t border-[#EAEEE7] pt-4">
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-[#132219] transition-colors hover:text-[#15663E]"
            >
              <Linkedin className="h-3.5 w-3.5 text-[#15663E]" />
              LinkedIn Profile
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

export function BrainsBehindMission() {
  const [sectionTitle, setSectionTitle] = useState(EXTRACTED_TEAM_SECTION.title);
  const [sectionDesc, setSectionDesc] = useState(EXTRACTED_TEAM_SECTION.description);
  const [members, setMembers] = useState<ExtractedTeamMember[]>(EXTRACTED_TEAM_SECTION.members);

  // Sync only team details from the previous application's public API if updated
  useEffect(() => {
    const syncTeamFromPreviousApp = async () => {
      try {
        const [contentRes, teamRes] = await Promise.all([
          fetch("/api/homepage-content").catch(() => null),
          fetch("/api/public-team").catch(() => null),
        ]);

        let currentMembers = [...EXTRACTED_TEAM_SECTION.members];

        if (contentRes && contentRes.ok) {
          const contentJson = await contentRes.json();
          const ot = contentJson?.data?.our_team;
          if (ot?.title) setSectionTitle(ot.title);
          if (ot?.description) setSectionDesc(ot.description);
          if (Array.isArray(ot?.items) && ot.items.length > 0) {
            currentMembers = ot.items.map((item: any) => ({
              email: item.email || "",
              name: item.name || "",
              role: item.role || "",
              bio: item.bio || "",
              image: item.image || "",
              linkedin: item.linkedin || "",
            }));
          }
        }

        if (teamRes && teamRes.ok) {
          const teamJson = await teamRes.json();
          if (Array.isArray(teamJson?.data)) {
            const dbUsers = teamJson.data as Array<{ email?: string; name?: string; image?: string }>;
            currentMembers = currentMembers.map((member) => {
              const match = dbUsers.find(
                (u) =>
                  u.email &&
                  member.email &&
                  u.email.toLowerCase() === member.email.toLowerCase()
              );
              if (match && match.image) {
                return {
                  ...member,
                  name: match.name || member.name,
                  image: match.image,
                };
              }
              return member;
            });
          }
        }

        const isNotPhravin = (m: any) =>
          !String(m.email || "").toLowerCase().includes("phravin") &&
          !String(m.name || "").toLowerCase().includes("phravin");

        setMembers(currentMembers.filter(isNotPhravin));
      } catch {
        // Keep extracted static fallback cleanly
      }
    };

    syncTeamFromPreviousApp();
  }, []);

  return (
    <section
      id="brains-behind-mission"
      className="bg-transparent py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-white/20 bg-[#0B1611]/75 p-6 text-center shadow-xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold tracking-wide text-emerald-300">
            {EXTRACTED_TEAM_SECTION.eyebrow}
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              textWrap: "balance",
            }}
          >
            {sectionTitle}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-200">{sectionDesc}</p>
        </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {members.slice(0, 3).map((member) => (
            <MemberCard key={member.email || member.name} member={member} />
          ))}
        </div>
        {members.length > 3 && (
          <div className="mt-7 flex flex-wrap justify-center gap-7">
            {members.slice(3).map((member) => (
              <div
                key={member.email || member.name}
                className="w-full sm:w-[calc(50%-0.875rem)] lg:w-[calc((100%-3.5rem)/3)]"
              >
                <MemberCard member={member} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
