import { RESEARCH_UNITS } from "./research-units";

// Mirrors the prototype's `tracks` array (files/source/app.full.js): the research
// units, re-described for the Academy's learning tracks, same ids/topics.
export interface AcademyTrack {
  id: string;
  name: { ar: string; en: string };
  desc: { ar: string; en: string };
  topics: { ar: string; en: string }[];
}

export const ACADEMY_TRACKS: AcademyTrack[] = RESEARCH_UNITS.map((u) => ({
  id: u.id,
  name: u.name,
  topics: u.topics,
  desc:
    u.id === "leadership"
      ? {
          ar: "تنمية مهارات القيادة والاستراتيجية والإدارة والحوكمة، وبناء المؤسسات وتطويرها، وإدارة التغيير والعمليات والأداء، بما يخدم المؤسسات العامة والشركات والجهات ذات الدور الاستراتيجي في الشأن العام.",
          en: "Develop skills in leadership, strategy, management and governance, institution building and development, and change, operations and performance management, serving public institutions, companies and organizations with a strategic role in public affairs.",
        }
      : {
          ar: `دورات وورش عمل تربط المعرفة بالتطبيق في ${u.name.ar}.`,
          en: `Courses and workshops connecting knowledge with practice in ${u.name.en}.`,
        },
}));
