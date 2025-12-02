export const samplePublications = [
  {
    id: "1",
    title: "Machine Learning Approaches for Climate Change Prediction",
    authors: ["Dr. Sarah Johnson", "Prof. Michael Chen", "Dr. Emily White"],
    year: 2024,
    citations: 142,
    journal: "Nature Climate Change",
    type: "Research Article",
    doi: "10.1038/s41558-024-00001",
    keywords: ["Machine Learning", "Climate Modeling", "Prediction"],
    abstract: "We present novel machine learning approaches for improving climate change predictions...",
    groupId: "1",
    memberIds: ["1", "2"]
  },
  {
    id: "2",
    title: "Novel Biomaterials for Tissue Engineering Applications",
    authors: ["Prof. Robert Davis", "Dr. Lisa Anderson"],
    year: 2023,
    citations: 89,
    journal: "Biomaterials Science",
    type: "Review",
    doi: "10.1039/d3bm00001",
    keywords: ["Biomaterials", "Tissue Engineering", "Regenerative Medicine"],
    abstract: "A comprehensive review of novel biomaterials in tissue engineering...",
    groupId: "2",
    memberIds: ["5", "6"]
  },
  {
    id: "3",
    title: "Quantum Computing in Drug Discovery: A Comprehensive Review",
    authors: ["Dr. James Wilson", "Dr. Maria Garcia", "Prof. David Kim"],
    year: 2024,
    citations: 67,
    journal: "Journal of Chemical Information",
    type: "Review",
    doi: "10.1021/acs.jcim.4c00001",
    keywords: ["Quantum Computing", "Drug Discovery", "Computational Chemistry"],
    abstract: "This review explores the applications of quantum computing in drug discovery...",
    groupId: "3",
    memberIds: ["7", "8"]
  },
  {
    id: "4",
    title: "Advanced Materials for Sustainable Energy Storage",
    authors: ["Prof. Jennifer Lee", "Dr. Thomas Brown"],
    year: 2023,
    citations: 156,
    journal: "Advanced Energy Materials",
    type: "Research Article",
    doi: "10.1002/aenm.202300001",
    keywords: ["Energy Storage", "Batteries", "Sustainable Materials"],
    abstract: "We report on advanced materials for next-generation energy storage systems...",
    groupId: "4",
    memberIds: ["10", "11"]
  },
  {
    id: "5",
    title: "Deep Learning for Weather Pattern Recognition",
    authors: ["Dr. Sarah Johnson", "Dr. Emily White"],
    year: 2023,
    citations: 78,
    journal: "Journal of Climate",
    type: "Research Article",
    doi: "10.1175/jcli-d-23-00001",
    keywords: ["Deep Learning", "Weather Patterns", "Climate Science"],
    abstract: "Novel deep learning architectures for weather pattern recognition...",
    groupId: "1",
    memberIds: ["1", "3"]
  },
  {
    id: "6",
    title: "Climate Model Ensemble Forecasting",
    authors: ["Prof. Michael Chen", "Dr. Sarah Johnson"],
    year: 2022,
    citations: 234,
    journal: "Nature Climate Change",
    type: "Research Article",
    doi: "10.1038/s41558-022-00001",
    keywords: ["Climate Modeling", "Ensemble Methods", "Forecasting"],
    abstract: "Improved ensemble forecasting methods for climate models...",
    groupId: "1",
    memberIds: ["2", "1"]
  }
];

export const members = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    role: "Principal Investigator",
    groupId: "1",
    email: "s.johnson@university.edu",
    hIndex: 28,
    i10Index: 45,
    totalCitations: 1842,
    totalPublications: 52,
    avatar: "SJ"
  },
  {
    id: "2",
    name: "Prof. Michael Chen",
    role: "Co-Principal Investigator",
    groupId: "1",
    email: "m.chen@university.edu",
    hIndex: 35,
    i10Index: 67,
    totalCitations: 3421,
    totalPublications: 78,
    avatar: "MC"
  },
  {
    id: "3",
    name: "Dr. Emily White",
    role: "Postdoctoral Researcher",
    groupId: "1",
    email: "e.white@university.edu",
    hIndex: 12,
    i10Index: 18,
    totalCitations: 456,
    totalPublications: 23,
    avatar: "EW"
  },
  {
    id: "4",
    name: "Alex Martinez",
    role: "PhD Student",
    groupId: "1",
    email: "a.martinez@university.edu",
    hIndex: 5,
    i10Index: 6,
    totalCitations: 89,
    totalPublications: 8,
    avatar: "AM"
  },
  {
    id: "5",
    name: "Prof. Robert Davis",
    role: "Principal Investigator",
    groupId: "2",
    email: "r.davis@university.edu",
    hIndex: 42,
    i10Index: 89,
    totalCitations: 5234,
    totalPublications: 102,
    avatar: "RD"
  },
  {
    id: "6",
    name: "Dr. Lisa Anderson",
    role: "Senior Researcher",
    groupId: "2",
    email: "l.anderson@university.edu",
    hIndex: 22,
    i10Index: 34,
    totalCitations: 1234,
    totalPublications: 45,
    avatar: "LA"
  },
  {
    id: "7",
    name: "Dr. James Wilson",
    role: "Principal Investigator",
    groupId: "3",
    email: "j.wilson@university.edu",
    hIndex: 31,
    i10Index: 52,
    totalCitations: 2567,
    totalPublications: 61,
    avatar: "JW"
  },
  {
    id: "8",
    name: "Dr. Maria Garcia",
    role: "Senior Researcher",
    groupId: "3",
    email: "m.garcia@university.edu",
    hIndex: 19,
    i10Index: 28,
    totalCitations: 892,
    totalPublications: 34,
    avatar: "MG"
  },
  {
    id: "9",
    name: "Prof. David Kim",
    role: "Co-Principal Investigator",
    groupId: "3",
    email: "d.kim@university.edu",
    hIndex: 38,
    i10Index: 71,
    totalCitations: 4123,
    totalPublications: 85,
    avatar: "DK"
  },
  {
    id: "10",
    name: "Prof. Jennifer Lee",
    role: "Principal Investigator",
    groupId: "4",
    email: "j.lee@university.edu",
    hIndex: 33,
    i10Index: 58,
    totalCitations: 2891,
    totalPublications: 67,
    avatar: "JL"
  },
  {
    id: "11",
    name: "Dr. Thomas Brown",
    role: "Senior Researcher",
    groupId: "4",
    email: "t.brown@university.edu",
    hIndex: 24,
    i10Index: 38,
    totalCitations: 1567,
    totalPublications: 48,
    avatar: "TB"
  },
  {
    id: "12",
    name: "Sophie Chen",
    role: "PhD Student",
    groupId: "1",
    email: "s.chen@university.edu",
    hIndex: 3,
    i10Index: 2,
    totalCitations: 34,
    totalPublications: 5,
    avatar: "SC"
  }
];

export const researchGroups = [
  {
    id: "1",
    name: "Center for Integrative Petroleum Research (CIPR)",
    department: "College of Petroleum Engineering & Geosciences (CPG), KFUPM",
    members: 12,
    publications: 45,
    totalCitations: 892,
    description:
      "An interdisciplinary research center focusing on integrative petroleum research across geosciences and engineering.",
    established: 2015,
    hIndex: 28,
    researchAreas: [
      "Enhanced Recovery",
      "Reservoir Monitoring",
      "Productivity Enhancement",
      "Drilling Optimization",
      "Reservoir Quality"
    ],
    programs: [
      {
        name: "Oilfield Chemistry",
        programLead: "Dr. Theis Ivan Solling"
      },
      {
        name: "Geomechanics",
        programLead: "Dr. Ruud Weijermars"
      },
      {
        name: "Geosystems",
        programLead: "Dr. Khalid A. H. Al-Ramadan"
      },
      {
        name: "Multiscale Multiphysics Modeling",
        programLead: "Dr. Martin Andersson"
      }
    ]
  }
];

export const publicationsByYear = {
  "1": [
    { year: 2020, count: 6, citations: 145 },
    { year: 2021, count: 8, citations: 234 },
    { year: 2022, count: 12, citations: 312 },
    { year: 2023, count: 10, citations: 421 },
    { year: 2024, count: 9, citations: 289 }
  ],
  "2": [
    { year: 2020, count: 4, citations: 89 },
    { year: 2021, count: 5, citations: 123 },
    { year: 2022, count: 7, citations: 178 },
    { year: 2023, count: 9, citations: 234 },
    { year: 2024, count: 7, citations: 156 }
  ],
  "3": [
    { year: 2020, count: 8, citations: 198 },
    { year: 2021, count: 10, citations: 267 },
    { year: 2022, count: 14, citations: 389 },
    { year: 2023, count: 13, citations: 456 },
    { year: 2024, count: 13, citations: 334 }
  ],
  "4": [
    { year: 2020, count: 5, citations: 112 },
    { year: 2021, count: 7, citations: 156 },
    { year: 2022, count: 9, citations: 223 },
    { year: 2023, count: 11, citations: 298 },
    { year: 2024, count: 9, citations: 201 }
  ]
};

export const publicationTypes = {
  "1": [
    { type: "Research Article", count: 28 },
    { type: "Review", count: 8 },
    { type: "Conference Paper", count: 7 },
    { type: "Book Chapter", count: 2 }
  ],
  "2": [
    { type: "Research Article", count: 20 },
    { type: "Review", count: 6 },
    { type: "Conference Paper", count: 4 },
    { type: "Book Chapter", count: 2 }
  ],
  "3": [
    { type: "Research Article", count: 35 },
    { type: "Review", count: 12 },
    { type: "Conference Paper", count: 9 },
    { type: "Book Chapter", count: 2 }
  ],
  "4": [
    { type: "Research Article", count: 25 },
    { type: "Review", count: 9 },
    { type: "Conference Paper", count: 5 },
    { type: "Book Chapter", count: 2 }
  ]
};

export const topVenues = {
  "1": [
    { name: "Nature Climate Change", count: 12 },
    { name: "Journal of Climate", count: 8 },
    { name: "Climate Dynamics", count: 6 },
    { name: "Geophysical Research Letters", count: 5 },
    { name: "Environmental Research Letters", count: 4 }
  ],
  "2": [
    { name: "Biomaterials Science", count: 8 },
    { name: "Advanced Healthcare Materials", count: 6 },
    { name: "Tissue Engineering", count: 5 },
    { name: "Biomaterials", count: 4 },
    { name: "Acta Biomaterialia", count: 3 }
  ],
  "3": [
    { name: "Journal of Chemical Information", count: 10 },
    { name: "Quantum Science and Technology", count: 9 },
    { name: "Physical Review A", count: 7 },
    { name: "Nature Quantum Information", count: 6 },
    { name: "npj Quantum Information", count: 5 }
  ],
  "4": [
    { name: "Advanced Energy Materials", count: 9 },
    { name: "Energy Storage Materials", count: 7 },
    { name: "Journal of Materials Chemistry A", count: 6 },
    { name: "ACS Energy Letters", count: 5 },
    { name: "Nano Energy", count: 4 }
  ]
};

export const collaborations = {
  "1": [
    { institution: "MIT", count: 12 },
    { institution: "Stanford University", count: 8 },
    { institution: "Max Planck Institute", count: 6 },
    { institution: "NOAA", count: 5 }
  ],
  "2": [
    { institution: "Johns Hopkins University", count: 9 },
    { institution: "Harvard Medical School", count: 7 },
    { institution: "ETH Zurich", count: 5 },
    { institution: "Karolinska Institute", count: 4 }
  ],
  "3": [
    { institution: "IBM Research", count: 10 },
    { institution: "Google Quantum AI", count: 8 },
    { institution: "Caltech", count: 6 },
    { institution: "University of Oxford", count: 5 }
  ],
  "4": [
    { institution: "Lawrence Berkeley Lab", count: 8 },
    { institution: "Argonne National Lab", count: 7 },
    { institution: "Cambridge University", count: 5 },
    { institution: "Toyota Research Institute", count: 4 }
  ]
};

export const departments = [
  {
    id: "1",
    name: "Environmental Sciences",
    groups: 3,
    publications: 128,
    citations: 2456
  },
  {
    id: "2",
    name: "Biomedical Engineering",
    groups: 2,
    publications: 87,
    citations: 1789
  },
  {
    id: "3",
    name: "Physics & Computer Science",
    groups: 4,
    publications: 165,
    citations: 3421
  },
  {
    id: "4",
    name: "Materials Science",
    groups: 3,
    publications: 112,
    citations: 2134
  }
];

export const collaborators = [
  { id: "1", name: "MIT", type: "University", collaborations: 23 },
  { id: "2", name: "Stanford Research Institute", type: "Research Institute", collaborations: 18 },
  { id: "3", name: "Google AI", type: "Industry", collaborations: 12 },
  { id: "4", name: "Max Planck Institute", type: "Research Institute", collaborations: 15 }
];
