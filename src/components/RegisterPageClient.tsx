"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import RegisterForm from "@/components/RegisterForm";

const AFTER_STEPS = [
  { n: "1", title: "Executive Call", desc: "An executive will call you to discuss how our league works." },
  { n: "2", title: "Payment", desc: "Payment is to be sent as directed by the executive." },
  {
    n: "3",
    title: "Confirmation",
    desc: "Confirmation of payment received from an executive guarantees your acceptance to the league in the following year.",
  },
  { n: "4", title: "Evaluation", desc: "You will attend a player evaluation session to assess your skill level." },
  { n: "5", title: "Draft", desc: "You will be drafted to a team based on your evaluation." },
];

export default function RegisterPageClient({ registrationFee, seasonYear }: { registrationFee: number; seasonYear: number }) {
  const formTopRef = useRef<HTMLDivElement>(null);
  const [success, setSuccess] = useState(false);

  // The success view replaces the form in place — without this, a user who
  // scrolled down while filling out the (long) form never sees the
  // confirmation message unless they scroll back up manually.
  useEffect(() => {
    if (success) {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [success]);

  if (success) {
    return (
      <div ref={formTopRef} className="mx-auto max-w-2xl px-5 py-24 text-center">
        <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-green-500" aria-hidden="true" />
        <h2 className="mb-4 text-3xl font-bold text-black">Registration Received!</h2>
        <p className="mb-2 text-lg text-gray-600">Thank you for registering for the {seasonYear} MMSPL season.</p>
        <p className="text-gray-500">An executive will contact you shortly to walk you through the next steps.</p>
        <button
          type="button"
          onClick={() => {
            setSuccess(false);
            requestAnimationFrame(() => {
              formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
          className="mt-8 inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-red-700"
        >
          Register Another Player
        </button>
      </div>
    );
  }

  return (
    <div ref={formTopRef} className="mx-auto max-w-7xl px-5 py-16">
      <div className="mb-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="sticky top-24 overflow-hidden rounded-xl border bg-white shadow">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white">
              <h2 className="text-lg font-semibold">League Information</h2>
            </div>
            <div className="space-y-4 px-6 pb-6 pt-6">
              <div>
                <h3 className="mb-2 font-bold text-black">Registration Fee</h3>
                <p className="mb-2 text-3xl font-bold text-red-600">${registrationFee}</p>
                <p className="text-sm text-gray-600">
                  Payable via e-transfer to: <br />
                  <span className="font-semibold">mmspl.finances@gmail.com</span>
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-2 font-bold text-black">Player Requirements</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2 text-red-600">&bull;</span>
                    <span>Must be at least 25 years old during the calendar year</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-600">&bull;</span>
                    <span>Reside in Markham OR be a principal business owner paying taxes in Markham</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-600">&bull;</span>
                    <span>Exceptions may be made if more players are needed</span>
                  </li>
                </ul>
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-2 font-bold text-black">Draft System</h3>
                <p className="text-sm text-gray-700">
                  New players are rated and drafted individually to maintain team competitiveness. Group or team
                  registrations are not accepted.
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-2 font-bold text-black">Evaluation Sessions</h3>
                <p className="text-sm text-gray-700">
                  Registration is guaranteed for those who pay and attend the new player evaluation sessions until
                  roster spots are filled. After that, you may join a waiting list.
                </p>
              </div>
              <div className="-mx-6 -mb-6 rounded-b-lg border-t bg-gray-50 px-6 py-4 pt-4">
                <p className="text-xs italic text-gray-600">Confirmation will be sent by email after payment is received.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-mt-24 lg:col-span-2">
          <RegisterForm onSuccess={() => setSuccess(true)} />
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border bg-gradient-to-r from-black to-gray-900 text-white shadow">
        <div className="px-6 pb-6 pt-6">
          <h3 className="mb-6 text-2xl font-bold">What Happens After Registration?</h3>
          <div className="grid gap-6 md:grid-cols-5">
            {AFTER_STEPS.map((step) => (
              <div key={step.n}>
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                  {step.n}
                </div>
                <h4 className="mb-1 font-semibold text-white">{step.title}</h4>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
