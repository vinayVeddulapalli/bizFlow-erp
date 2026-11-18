# BizFlow ERP — Infrastructure Cost Projections & Frugal Scaling Model

## 1. Core Frugality Principle

BizFlow ERP is architected by a solo developer. Every architectural and infrastructural decision is guided by the principle of **High Performance at Minimal Cost**:
1. Zero unnecessary SaaS dependencies.
2. 100% Free & Open-Source Software (FOSS) for all local development.
3. Every paid cloud service must be strictly evaluated and approved before adoption.

---

## 2. Local Development Environment ($0.00 / Month)

During all development, prototyping, and testing phases, infrastructure cost is strictly **$0.00**:

| Component | Tool / Technology | Monthly Cost | Notes |
| :--- | :--- | :--- | :--- |
| **Relational Database** | PostgreSQL 16 via Docker | $0.00 | Local container with persistent Docker volume |
| **Cache & Queues** | Redis 7 Alpine via Docker | $0.00 | Local container |
| **Object Storage** | MinIO via Docker | $0.00 | 100% S3-compatible local bucket storage |
| **API Runtime** | Node.js / NestJS (Local) | $0.00 | Runs directly on developer workstation |
| **Web Frontend** | Next.js Dev Server (Local) | $0.00 | Runs on localhost:3000 |
| **Mobile Tooling** | Expo CLI & Expo Go (Local) | $0.00 | Free Android/iOS preview on physical devices |
| **Monorepo Build** | Turborepo & pnpm | $0.00 | Open source local build cache |
| **Total Dev Cost** | | **$0.00 / month** | |

---

## 3. Production Hosting Architecture (Tier 1: Launch Phase)

For launching the initial live production environment serving up to **50 active small businesses**:

### Recommended Option: Hybrid VPS + Cloudflare (Most Cost-Effective)

```
[Users / Internet]
       │
       ▼
[Cloudflare DNS + Free SSL + CDN + WAF] ($0.00)
       │
       ├───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
[Next.js Web Frontend]        [NestJS API + Background Workers]  [Object Storage]
Hosted on Cloudflare Pages/   Hosted on Hetzner Cloud VPS /      Cloudflare R2
Vercel Hobby Tier             DigitalOcean Droplet               Zero Egress Fees
Cost: $0.00 / mo              Cost: $6.00 - $12.00 / mo          Cost: $0.00 / mo (<10GB)
```

| Component | Provider / Tier | Est. Cost (USD) | Est. Cost (INR) | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Web App (Next.js)** | Cloudflare Pages / Vercel Free | $0.00 | ₹0 | Generous free edge bandwidth and global CDN. |
| **Backend API (NestJS)** | Hetzner Cloud CX22 (2 vCPU, 4GB RAM) or DigitalOcean $12 | ~$6.00 - $12.00 | ₹500 - ₹1,000 | Docker Compose running NestJS, PostgreSQL 16, Redis, and Nginx. |
| **Database** | PostgreSQL in Docker on VPS (or Supabase Free Tier) | $0.00 (included in VPS) | ₹0 | Backed up daily to offsite storage. |
| **Object Storage** | Cloudflare R2 (10GB free, $0 egress fees) | $0.00 | ₹0 | Stores invoice PDFs and company logos with zero bandwidth charges. |
| **SSL & Security** | Cloudflare Free Plan | $0.00 | ₹0 | Automatic TLS 1.3, DDoS protection, edge caching. |
| **Domain Name** | Standard `.com` or `.in` | ~$1.00 / mo | ~$80 / mo | Annual domain renewal ($12/year). |
| **Transactional Email** | Resend / Brevo (300 emails/day free) | $0.00 | ₹0 | User invites, password resets, invoice emails. |
| **Total Launch Cost** | | **~$7.00 - $13.00 / mo** | **~₹600 - ₹1,100 / mo** | Complete, production-grade cloud setup. |

---

## 4. Scaling Cost Model Over Growth Tiers

| Scale Tier | Active Businesses | Concurrent Requests | Recommended Infrastructure Stack | Total Estimated Monthly Cost | Cost Per Active Business |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Launch** | 1 – 50 | 5 – 25 req/sec | 1x Hetzner CX22 (4GB RAM) + Cloudflare + R2 | **$8 - $15 / mo** | ~$0.20 / business |
| **Tier 2: Growth** | 50 – 250 | 50 – 150 req/sec | Managed Neon/Supabase DB ($25) + 2x App VPS ($20) + Cloudflare R2 | **$45 - $70 / mo** | ~$0.25 / business |
| **Tier 3: Mid-Market** | 250 – 1,000 | 250 – 600 req/sec | Managed PostgreSQL (8GB RAM, High Availability) + Load-balanced API cluster + Redis Cluster | **$150 - $280 / mo** | ~$0.22 / business |
| **Tier 4: Enterprise** | 1,000 – 5,000+ | 1,500+ req/sec | Multi-AZ Managed DB + Read Replicas + Auto-scaling Kubernetes/ECS cluster | **$500 - $950 / mo** | < $0.15 / business |

---

## 5. Paid Service Evaluation Policy

No paid third-party service (e.g., Twilio for SMS, AWS SES for high-volume email, paid OCR APIs, official GST Suvidha Provider / GSP APIs) will be introduced without:
1. Explaining the exact operational business necessity.
2. Presenting at least two competitive pricing options.
3. Providing a zero-cost open-source fallback or manual workflow option.
4. Obtaining explicit approval from the project owner before integration.
