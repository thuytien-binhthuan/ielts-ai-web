"use client";

import { AppContent_Location_GetCountries } from "~apis/requests/app-content/location/get-countries";
import type { Country } from "~types/apis/app-content";

function CountryRow({ country, index }: { country: Country; index: number }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-[#1b2e3e]/10 bg-white/80 px-3 py-2 text-sm">
      <span className="font-medium text-[#1b2e3e]">{country.name}</span>
      <span className="rounded-full bg-[#ef6c3a]/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-[#ef6c3a]">
        {country.code || `#${index + 1}`}
      </span>
    </li>
  );
}

export function CountriesProbe() {
  const countriesQuery = AppContent_Location_GetCountries();

  return (
    <section className="rounded-3xl border border-[#1b2e3e]/10 bg-white/80 p-6 shadow-[0_16px_40px_-28px_rgba(27,46,62,0.4)] backdrop-blur-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl text-[#1b2e3e]">Shared API Probe</h2>
          <p className="mt-2 max-w-xl text-sm text-[#1b2e3e]/70 sm:text-base">
            Data comes from existing mobile request hook <code>AppContent_Location_GetCountries</code> in <code>src/apis/requests</code>.
          </p>
        </div>
        <button
          className="rounded-full border border-[#1b2e3e]/20 bg-white px-4 py-2 text-sm font-medium text-[#1b2e3e] transition hover:border-[#1b2e3e]/40 hover:bg-[#1b2e3e]/5"
          type="button"
          onClick={() => {
            countriesQuery.refetch();
          }}
        >
          Refetch
        </button>
      </div>

      {countriesQuery.isLoading ? (
        <p className="mt-5 text-sm text-[#1b2e3e]/75">Loading countries...</p>
      ) : null}

      {countriesQuery.error ? (
        <p className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Request failed. Check network or endpoint configuration.</p>
      ) : null}

      {countriesQuery.data ? (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {countriesQuery.data.slice(0, 20).map((country, index) => (
            <CountryRow key={`${country.code}-${country.name}`} country={country} index={index} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
