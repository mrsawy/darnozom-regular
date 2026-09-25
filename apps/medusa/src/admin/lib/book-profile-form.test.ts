import { describe, it, expect } from "vitest";
import { EMPTY_PROFILE_FORM, fromProfile, splitKeywords, splitPeople, toProfilePayload } from "./book-profile-form";

describe("book profile form helpers", () => {
  it("splits people one per line (or Arabic comma), keeping 'Last, First' intact", () => {
    expect(splitPeople("أحمد يوسف\nSmith, John\n\n")).toEqual(["أحمد يوسف", "Smith, John"]);
    expect(splitPeople("أحمد، محمد")).toEqual(["أحمد", "محمد"]);
  });

  it("splits keywords on commas, Arabic commas and new lines", () => {
    expect(splitKeywords("waqf, الوقف،  zakat\nالزكاة")).toEqual(["waqf", "الوقف", "zakat", "الزكاة"]);
  });

  it("converts the form to the API payload with numbers and nulls", () => {
    const payload = toProfilePayload({
      ...EMPTY_PROFILE_FORM,
      authors: "أحمد",
      pages: "320",
      publication_year: "",
      isbn: "978-0-306-40615-7",
      digital_rights: true,
    });
    expect(payload).toMatchObject({
      authors: ["أحمد"], pages: 320, publication_year: null, volumes: 1,
      isbn: "978-0-306-40615-7", digital_rights: true, primary_category_id: null,
    });
  });

  it("round-trips a stored profile", () => {
    const form = fromProfile({ authors: ["A", "B"], keywords: ["x", "y"], pages: 10, volumes: 2, language: "en", digital_rights: true });
    expect(form).toMatchObject({ authors: "A\nB", keywords: "x، y", pages: "10", volumes: "2", language: "en", digital_rights: true });
    expect(fromProfile(null)).toEqual(EMPTY_PROFILE_FORM);
  });
});
