import { type ModePack } from '@careertwin/schemas';

export const backendMode: ModePack = {
  id: 'backend',
  name: 'Backend Engineering',
  domain: 'backend',
  scoringRubric: {
    'system-design': 25,
    'api-design': 20,
    'databases': 20,
    'performance': 15,
    'testing': 10,
    'devops-awareness': 10,
  },
  keywords: [
    'Node.js', 'Python', 'Go', 'Java', 'Rust', 'PostgreSQL', 'Redis',
    'gRPC', 'REST', 'GraphQL', 'microservices', 'event-driven',
    'message queues', 'Kafka', 'RabbitMQ', 'Docker', 'Kubernetes',
    'CI/CD', 'observability', 'distributed systems',
  ],
  prompts: {
    bulletRewrite: 'Emphasize throughput, latency, scale, and system reliability.',
    summaryTone: 'Backend engineer who builds reliable, scalable systems.',
    interviewFocus: 'System design, API contracts, database modeling, concurrency.',
  },
};

export const devopsMode: ModePack = {
  id: 'devops',
  name: 'DevOps / Platform Engineering',
  domain: 'devops',
  scoringRubric: {
    'infrastructure': 25,
    'ci-cd': 20,
    'containers': 20,
    'monitoring': 15,
    'security': 10,
    'automation': 10,
  },
  keywords: [
    'Terraform', 'Ansible', 'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker',
    'Helm', 'ArgoCD', 'GitHub Actions', 'GitLab CI', 'Jenkins',
    'Prometheus', 'Grafana', 'Datadog', 'ELK', 'SRE', 'IaC',
    'Linux', 'networking', 'zero-downtime deployments',
  ],
  prompts: {
    bulletRewrite: 'Emphasize uptime, automation, deployment frequency, and incident response.',
    summaryTone: 'Platform engineer who builds reliable infrastructure at scale.',
    interviewFocus: 'IaC, container orchestration, CI/CD pipelines, incident management.',
  },
};

export const fullstackMode: ModePack = {
  id: 'fullstack',
  name: 'Full Stack Engineering',
  domain: 'fullstack',
  scoringRubric: {
    'frontend': 20,
    'backend': 20,
    'databases': 15,
    'deployment': 15,
    'product-sense': 15,
    'testing': 15,
  },
  keywords: [
    'React', 'Next.js', 'Vue', 'TypeScript', 'Node.js', 'Python',
    'PostgreSQL', 'MongoDB', 'REST', 'GraphQL', 'Tailwind', 'CSS',
    'Vercel', 'AWS', 'Docker', 'CI/CD', 'responsive design',
    'authentication', 'payment integration', 'real-time',
  ],
  prompts: {
    bulletRewrite: 'Show end-to-end ownership from UI to database to deployment.',
    summaryTone: 'Full stack engineer who ships complete products.',
    interviewFocus: 'Product thinking, system design, frontend architecture, API design.',
  },
};

export const frontendMode: ModePack = {
  id: 'frontend',
  name: 'Frontend Engineering',
  domain: 'frontend',
  scoringRubric: {
    'ui-frameworks': 25,
    'css-design-systems': 20,
    'performance': 20,
    'accessibility': 15,
    'state-management': 10,
    'testing': 10,
  },
  keywords: [
    'React', 'Vue', 'Svelte', 'Angular', 'TypeScript', 'JavaScript',
    'CSS', 'Tailwind', 'Sass', 'Figma', 'Storybook', 'design systems',
    'a11y', 'WCAG', 'responsive', 'SSR', 'Next.js', 'Vite',
    'Web Components', 'animation', 'performance optimization',
  ],
  prompts: {
    bulletRewrite: 'Emphasize user experience, performance metrics, and design system contributions.',
    summaryTone: 'Frontend engineer who crafts pixel-perfect, accessible interfaces.',
    interviewFocus: 'Component architecture, CSS mastery, rendering, accessibility.',
  },
};

export const dataMode: ModePack = {
  id: 'data',
  name: 'Data Engineering',
  domain: 'data',
  scoringRubric: {
    'pipelines': 25,
    'warehousing': 20,
    'sql': 20,
    'orchestration': 15,
    'streaming': 10,
    'governance': 10,
  },
  keywords: [
    'Python', 'SQL', 'Spark', 'Airflow', 'dbt', 'Snowflake', 'BigQuery',
    'Redshift', 'Kafka', 'Flink', 'ETL', 'ELT', 'data modeling',
    'data lake', 'data warehouse', 'Parquet', 'Delta Lake',
    'data quality', 'lineage', 'governance',
  ],
  prompts: {
    bulletRewrite: 'Emphasize data volume, pipeline reliability, and business impact of analytics.',
    summaryTone: 'Data engineer who builds reliable data infrastructure.',
    interviewFocus: 'SQL optimization, pipeline design, data modeling, distributed processing.',
  },
};

export const aiMlMode: ModePack = {
  id: 'ai-ml',
  name: 'AI / Machine Learning',
  domain: 'ai-ml',
  scoringRubric: {
    'modeling': 25,
    'ml-ops': 20,
    'data-prep': 20,
    'research': 15,
    'deployment': 10,
    'evaluation': 10,
  },
  keywords: [
    'Python', 'PyTorch', 'TensorFlow', 'scikit-learn', 'Hugging Face',
    'LLMs', 'fine-tuning', 'RAG', 'embeddings', 'NLP', 'computer vision',
    'MLOps', 'MLflow', 'Weights & Biases', 'feature engineering',
    'model serving', 'A/B testing', 'experiment tracking',
  ],
  prompts: {
    bulletRewrite: 'Emphasize model performance metrics, production deployment, and business outcomes.',
    summaryTone: 'ML engineer who bridges research and production.',
    interviewFocus: 'ML system design, model evaluation, deployment strategies, math foundations.',
  },
};

export const mobileMode: ModePack = {
  id: 'mobile',
  name: 'Mobile Engineering',
  domain: 'mobile',
  scoringRubric: {
    'native-frameworks': 25,
    'ui-ux': 20,
    'performance': 20,
    'architecture': 15,
    'testing': 10,
    'release-mgmt': 10,
  },
  keywords: [
    'Swift', 'SwiftUI', 'Kotlin', 'Jetpack Compose', 'React Native',
    'Flutter', 'iOS', 'Android', 'App Store', 'Play Store',
    'push notifications', 'offline-first', 'accessibility',
    'Core Data', 'Room', 'animations', 'gestures',
  ],
  prompts: {
    bulletRewrite: 'Emphasize app store metrics, user retention, performance optimizations.',
    summaryTone: 'Mobile engineer who ships polished, performant apps.',
    interviewFocus: 'Platform-specific architecture, lifecycle management, UI performance.',
  },
};

export const sreMode: ModePack = {
  id: 'sre',
  name: 'Site Reliability Engineering',
  domain: 'sre',
  scoringRubric: {
    'reliability': 25,
    'incident-response': 20,
    'monitoring': 20,
    'automation': 15,
    'capacity-planning': 10,
    'slos': 10,
  },
  keywords: [
    'SLO', 'SLI', 'SLA', 'error budget', 'incident management',
    'on-call', 'runbooks', 'Prometheus', 'Grafana', 'PagerDuty',
    'chaos engineering', 'load testing', 'capacity planning',
    'toil reduction', 'blameless postmortems', 'observability',
  ],
  prompts: {
    bulletRewrite: 'Emphasize uptime improvements, incident reduction, and toil elimination.',
    summaryTone: 'SRE who ensures systems stay reliable at scale.',
    interviewFocus: 'SLO design, incident management, distributed systems debugging.',
  },
};

export const startupGeneralistMode: ModePack = {
  id: 'startup-generalist',
  name: 'Startup Generalist',
  domain: 'startup',
  scoringRubric: {
    'breadth': 20,
    'shipping-speed': 20,
    'product-sense': 20,
    'ownership': 15,
    'adaptability': 15,
    'communication': 10,
  },
  keywords: [
    'full-stack', 'product engineering', 'MVP', 'rapid prototyping',
    'founder', 'technical co-founder', 'startup', 'seed stage',
    'wearing many hats', 'customer-facing', 'growth engineering',
    'analytics', 'A/B testing', 'feature flags',
  ],
  prompts: {
    bulletRewrite: 'Emphasize speed, breadth, customer impact, and ownership.',
    summaryTone: 'Startup engineer who ships fast and owns outcomes.',
    interviewFocus: 'Product thinking, speed vs quality tradeoffs, technical leadership.',
  },
};

export const allModePacks: ModePack[] = [
  backendMode,
  devopsMode,
  fullstackMode,
  frontendMode,
  dataMode,
  aiMlMode,
  mobileMode,
  sreMode,
  startupGeneralistMode,
];

export function getModePack(id: string): ModePack | undefined {
  return allModePacks.find(m => m.id === id);
}
