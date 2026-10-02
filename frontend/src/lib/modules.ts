import { InspectionType } from './types';

export interface ModuleMeta {
  id: InspectionType;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  detects: string[];
  limitations: string;
  icon: string;
  description: string;
}

export const MODULES: Record<InspectionType, ModuleMeta> = {
  crack_detection: {
    id: 'crack_detection',
    slug: 'crack',
    name: 'Module A — Concrete Crack Detection',
    shortName: 'Crack Detection',
    tagline: 'Visible cracks in concrete surfaces',
    detects: [
      'Visible cracks on concrete walls, slabs, and columns',
      'Continuous surface fissures and fracture patterns',
      'Relative length and visible damage area ratios',
    ],
    limitations: 'Crack width and depth cannot be measured from uncalibrated 2D imagery; does not assess structural soundness.',
    icon: 'Activity',
    description: 'Analyze concrete structures for visible surface cracks, structural fissures, and preliminary distress indicators.',
  },
  pothole_detection: {
    id: 'pothole_detection',
    slug: 'pothole',
    name: 'Module B — Road & Pothole Detection',
    shortName: 'Road & Pothole Detection',
    tagline: 'Visible potholes and pavement distress',
    detects: [
      'Potholes and asphalt surface depressions',
      'Pavement surface disintegration',
      'Relative damage surface footprint',
    ],
    limitations: 'Pothole depth and volume cannot be determined; water reflections and shadowed areas may affect accuracy.',
    icon: 'AlertTriangle',
    description: 'Identify visible potholes and road surface breakdown to help prioritize municipal maintenance.',
  },
  safety_detection: {
    id: 'safety_detection',
    slug: 'safety',
    name: 'Module C — Construction Safety',
    shortName: 'Construction Safety',
    tagline: 'People and visible helmets; helmet-visibility compliance',
    detects: [
      'Site personnel presence (people detected)',
      'Visible safety helmets / hard hats',
      'Visible helmet compliance percentage',
    ],
    limitations: 'Assumes all detected people are site personnel; small or occluded helmets may not be visible; does not evaluate vests or harnesses.',
    icon: 'ShieldCheck',
    description: 'Monitor on-site safety compliance by detecting visible personnel and hard-hat wearing status.',
  },
};

export const SLUG_TO_TYPE: Record<string, InspectionType> = {
  crack: 'crack_detection',
  pothole: 'pothole_detection',
  safety: 'safety_detection',
};

export const TYPE_TO_SLUG: Record<InspectionType, string> = {
  crack_detection: 'crack',
  pothole_detection: 'pothole',
  safety_detection: 'safety',
};

export interface ModuleDefinition {
  id: InspectionType;
  title: string;
  description: string;
  surface: string;
  modelPipeline: string;
  targetDefect: string;
  metricsOutput: string;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'crack_detection',
    title: 'Concrete Crack Inspection',
    description: 'Automated detection of surface cracks and fracture lines in concrete walls, slabs, and columns.',
    surface: 'Concrete Structures',
    modelPipeline: 'Classical CV (Sato Ridge) / YOLOv8',
    targetDefect: 'Concrete Cracks',
    metricsOutput: 'Relative length, area ratio, grid location',
  },
  {
    id: 'pothole_detection',
    title: 'Asphalt Pothole Inspection',
    description: 'Visual identification and severity rating of road potholes and asphalt surface depressions.',
    surface: 'Asphalt Pavements',
    modelPipeline: 'YOLOv8 Object Detection',
    targetDefect: 'Road Potholes',
    metricsOutput: 'Area ratio, confidence, location grid',
  },
  {
    id: 'safety_detection',
    title: 'Site Safety & PPE Observation',
    description: 'Detection of on-site personnel and hard-hat compliance observation for safety monitoring.',
    surface: 'Construction Sites',
    modelPipeline: 'YOLOv8 Person + Helmet Detection',
    targetDefect: 'PPE Compliance',
    metricsOutput: 'Compliance %, headcount, helmet count',
  },
];

export function getModuleById(id: InspectionType): ModuleDefinition {
  return MODULE_DEFINITIONS.find((m) => m.id === id) || MODULE_DEFINITIONS[0];
}

