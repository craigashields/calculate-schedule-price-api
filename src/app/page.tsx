import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col gap-y-4 items-center justify-center">
        <h1 className="text-black dark:text-white text-4xl sm:text-5xl font-semibold text-center">
          Calculate Schedule Price API
        </h1>
        <h2 className="mt-6">
          Primary aimed at publishers, this API calculates a total price based
          on unit price and the number of issues published between 2 dates
        </h2>
        <div className="mt-14 mb-32 grid text-center lg:mb-0 lg:text-left">
          <a
            href="https://craigashields.github.io/api-documentation/calculate-schedule-pricing.html"
            className="group rounded-lg border border-gray-600 border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Docs{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                -&gt;
              </span>
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Visit here for in-depth API documentation.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
