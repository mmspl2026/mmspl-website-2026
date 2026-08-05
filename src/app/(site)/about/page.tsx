import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";
import { ABOUT_PAGE_IMAGES, CHARITY_PRESENTATIONS, LEAGUE_STATS } from "@/lib/seed-content";
import { urlFor } from "@/lib/sanity/image";
import CommunityPhotoStrip from "@/components/CommunityPhotoStrip";

export const metadata: Metadata = { title: "About" };

const HISTORY_MILESTONES = [
  {
    year: "Mid-1960s",
    text: "Markham residents form a fast-pitch Sunday night league at Morgan Park with four teams.",
  },
  {
    year: "1968",
    text: 'Facing a shortage of pitching talent, the league pivots to slo-pitch. Jim McGregor founds the "Markham Men\'s Fun League" with six teams.',
  },
  {
    year: "1970s–80s",
    text: "The league grows steadily through the following two decades, reaching 16 teams by 1981.",
  },
  {
    year: "1986",
    text: "The league adopts its current constitution, formalizing governance for the growing membership.",
  },
  {
    year: "Late 1980s–90s",
    text: 'The league rebrands to the "Markham Men\'s Slo-Pitch League" — the name it carries today.',
  },
  {
    year: "2018",
    text: "MMSPL celebrates its 50th anniversary. That year's Charity Tournament features a special Alumni Game, bringing together players from across five decades to mark the occasion.",
  },
  {
    year: "2020–2022",
    text: "The 2020 season is cancelled, with a shortened, unofficial season played in 2021. The break is a quiet reminder of how much the diamond means to its players — the friendships, the community, and the simple joy of the game. MMSPL returns from it a closer, stronger league.",
  },
  {
    year: "Today",
    text: `MMSPL remains the oldest league in Markham: ${LEAGUE_STATS.teams} teams, ${LEAGUE_STATS.playersPerTeam} players each, ages ${LEAGUE_STATS.ageRange}, spanning generations of players.`,
  },
];

const FIFTY_YEARS_PARAGRAPHS = [
  `In the mid 1960's, a group of Markham residents decided to play fast pitch in a Sunday night league at Morgan Park. This 4 team league consisted of the South Markham (Ace Pools), East Markham, North Sherwood (The Condo Kings Army) and South Sherwood (S&H Raiders) and lasted only a couple of seasons due to the lack of sufficient pitching.`,
  `In 1968, the league decided to play Slo-Pitch. There were two more teams that decided to join the league. Those teams were the Firemen and The Kinsmen and the league founder, Jim McGregor formed the new name of Markham Men's Fun League.`,
  `In 1970, four teams from Unionville wanted to join the newly formed Markham Men's Fun League. Sherwood Green (Main's Mansion Rangers) and Sherwood Estates (Seagate) were introduced to the league along with the other two Unionville teams.`,
  `The league eventually expanded to 12 teams prior to 1974 when two of the four Unionville teams that joined separated from the league and formed their own league. In need of an expansion due to the booming population of the "Old Markham" area in the late 70's to early 80's, the Markham Mens Fun League expanded their league with teams expanding every year from 1978 to 1981 to bring the total to 16 teams.`,
  `Since 1982, the MMSPL has become involved within the community of Markham. Every June, a charity tournament is played and the league donates to various local causes. The MMSPL will continue to add to our accomplishments to help our community for years to come.`,
];

export default async function AboutPage() {
  const settings = await sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null);

  const heroImage = settings?.aboutHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : ABOUT_PAGE_IMAGES.hero;

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative h-[260px] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,12,0.65), rgba(10,10,12,0.25) 35%, rgba(10,10,12,0.85) 80%), url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute left-0 top-0 px-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>{" "}
            / About
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            About MMSPL
          </h1>
          <p className="mt-1.5 text-base text-white/70">Over 50 years of tradition and community</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16">
        <section className="mb-16">
          <h2 className="mb-6 font-sans text-4xl font-bold normal-case tracking-normal text-black">Our League</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="mb-4 leading-relaxed text-gray-700">
                The Markham Men&apos;s Slo-Pitch League is a semi-competitive, slo-pitch league with 14 teams of 15
                players each. Players range in age from 25-60+.
              </p>
              <p className="mb-4 leading-relaxed text-gray-700">
                Established as a 4 team recreational softball league, the Markham Men&apos;s Slo-Pitch League
                (originally Markham Men&apos;s Fun League) played their first season in the summer of 1968.
              </p>
              <p className="mb-4 leading-relaxed text-gray-700">
                Since that time we have grown to 14 teams and present The Jim McGregor trophy, named after our
                founder, to the Playoff Champion every season.
              </p>
            </div>
            <div>
              <p className="mb-4 leading-relaxed text-gray-700">
                Our regular season runs from May to September with games on Tuesdays and Thursdays.
              </p>
              <div className="mt-4 rounded-lg border-2 border-red-600 bg-white p-6">
                <h3 className="mb-3 text-xl font-bold text-black">Game Locations</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2 text-red-600">&bull;</span>
                    <div>
                      <strong>Centennial Park</strong>
                      <br />
                      <span className="text-sm text-gray-600">Bullock and McCowan</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-600">&bull;</span>
                    <div>
                      <strong>Mintleaf Park</strong>
                      <br />
                      <span className="text-sm text-gray-600">Fincham and Wootten Way N.</span>
                    </div>
                  </li>
                </ul>
                <p className="mt-4 text-sm text-gray-700">
                  Teams also participate in a Charity Tournament (early-June) and a Play-off Tournament
                  (mid-September), with 3 guaranteed games per tournament.
                </p>
              </div>
            </div>
          </div>
        </section>

        <CommunityPhotoStrip photos={settings?.homeCommunityPhotos} />

        <section className="mb-16 mt-16">
          <h2 className="mb-6 font-sans text-4xl font-bold normal-case tracking-normal text-black">In The Community</h2>
          <div className="mb-8 rounded-lg bg-red-600 p-8 text-white">
            <h3 className="mb-4 text-3xl font-bold">Supporting Our Community</h3>
            <p className="text-lg leading-relaxed">
              The Markham Men&apos;s Slo-Pitch League is proud to support local Markham charities through our annual
              Charity Tournament.
            </p>
          </div>
          <p className="mb-8 leading-relaxed text-gray-700">
            In 1982, with the opening of Centennial Community Park, the Markham Men&apos;s Slo-Pitch League played
            their inaugural Inter Mural Community Fun Tournament to raise funds for local charities helping people
            directly in The Markham Community.
          </p>
          <h3 className="mb-6 text-2xl font-bold text-black">Recent Charity Presentations</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CHARITY_PRESENTATIONS.flatMap((entry) =>
              entry.recipients.map((recipient, i) => (
                <div
                  key={`${entry.year}-${i}`}
                  className="overflow-hidden rounded-lg border border-black/10 bg-white shadow transition-shadow hover:shadow-xl"
                >
                  <div className="h-48 overflow-hidden">
                    <Image
                      src={recipient.image}
                      alt={recipient.name}
                      width={640}
                      height={480}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-sm font-semibold text-red-600">{entry.year} Charity Presentation</p>
                    <h4 className="font-bold text-black">{recipient.name}</h4>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mb-16 mt-16">
          <h2 className="mb-6 font-sans text-4xl font-bold normal-case tracking-normal text-black">Our History</h2>
          <ol className="mt-8 space-y-8 border-l-2 border-brand pl-6">
            {HISTORY_MILESTONES.map((m) => (
              <li key={m.year}>
                <p className="text-sm font-heading uppercase tracking-wide text-brand">{m.year}</p>
                <p className="mt-1 max-w-2xl text-black/80">{m.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-8 flex items-center justify-center">
              <Image src={ABOUT_PAGE_IMAGES.logo50} alt="50 Years Logo" width={200} height={172} className="h-32 w-auto" />
            </div>
            <h2 className="mb-6 text-center font-sans text-4xl font-bold normal-case tracking-normal text-black">
              Celebrating 50 Years in 2018
            </h2>
            <div className="space-y-4 leading-relaxed text-gray-700">
              {FIFTY_YEARS_PARAGRAPHS.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p className="text-lg font-semibold text-black">
                Thank you to all members of this great league for continuing to support us and participating in a
                memorable benchmark for this league! Here&apos;s to 50 years and many more memorable years to come!
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
