import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Dynamic page config (retained)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const dynamicParams = true;

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) => (
  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.10]">
    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/20 via-violet-400/10 to-sky-400/10 blur-2xl" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-amber-300/10 via-rose-400/10 to-indigo-400/20 blur-2xl" />
    </div>

    <div className="relative flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white/95">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{description}</p>
      </div>
    </div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-5 backdrop-blur-xl">
    <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/60">{label}</div>
  </div>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(217,70,239,0.22),transparent_60%),radial-gradient(1000px_circle_at_50%_110%,rgba(14,165,233,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.85))]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <span className="text-xl">⚓</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide text-white/95 sm:text-base">
                航向标合作伙伴服务系统
              </div>
              <div className="hidden text-xs tracking-wide text-white/60 sm:block">
                Partner Intelligence · CRM · Appeals
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="outline"
                className="h-10 rounded-full border-white/15 bg-white/5 px-5 text-white/90 hover:bg-white/10 hover:text-white"
              >
                登录
              </Button>
            </Link>
            <Link href="/register">
              <Button className="h-10 rounded-full bg-white px-5 text-black hover:bg-white/90">
                申请接入
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12 shadow-[0_60px_140px_-80px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/30 via-fuchsia-400/15 to-sky-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300/10 via-rose-400/15 to-violet-400/25 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs tracking-[0.18em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              稳定 · 合规 · 可追溯
            </div>

            <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              高端合作伙伴运营中枢
              <span className="block bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                让数据成为你的底气
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              用统一看板管理客户、报备、冲突申诉与跟进节奏。把不确定性变成可视化流程，把每一次合作变成可复用的增长飞轮。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="h-12 w-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400 px-8 text-black shadow-lg shadow-indigo-500/20 hover:brightness-110 sm:w-auto">
                  进入系统
                </Button>
              </Link>
              <Link href="/appeals/submit" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/15 bg-white/5 px-8 text-white/90 hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  提交申诉
                </Button>
              </Link>
              <div className="text-xs text-white/55 sm:ml-2">
                30 秒完成上手 · 全流程留痕
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <Stat label="线索/客户" value="统一资产库" />
              <Stat label="报备冲突" value="规则透明" />
              <Stat label="数据审计" value="可追溯" />
              <Stat label="权限分层" value="更安心" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-12">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                核心能力，一眼高级
              </h2>
              <p className="mt-2 text-sm text-white/65">
                不堆叠功能，只把关键流程做到极致、可控、可复用。
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon="📈"
              title="经营看板"
              description="关键指标一屏掌控：新增、转化、跟进、申诉与合作效率。"
            />
            <FeatureCard
              icon="🧭"
              title="报备锁定"
              description="先到先得、规则明确；降低扯皮，提升成交确定性。"
            />
            <FeatureCard
              icon="🛡️"
              title="权限与审计"
              description="分层授权、敏感字段保护、访问留痕，合规更放心。"
            />
            <FeatureCard
              icon="🤝"
              title="协作闭环"
              description="从客户建立到跟进、成交、复盘，形成可复制的方法论。"
            />
          </div>
        </section>

        {/* Brand statement */}
        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl lg:col-span-2">
            <div className="text-xs uppercase tracking-[0.18em] text-white/60">理念</div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              因为相信，所以看见
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
              真正的合作不是分割利益，而是共同创造增量。我们用数据作为罗盘、流程作为引擎，
              让每一个伙伴都在同一套规则里获得确定性。
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.18em] text-white/60">快速入口</div>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/dashboard">
                <Button className="w-full rounded-2xl bg-white px-6 py-6 text-black hover:bg-white/90">
                  打开仪表盘
                </Button>
              </Link>
              <Link href="/crm">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-white/15 bg-white/5 px-6 py-6 text-white/90 hover:bg-white/10"
                >
                  进入 CRM
                </Button>
              </Link>
              <Link href="/appeals">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-white/15 bg-white/5 px-6 py-6 text-white/90 hover:bg-white/10"
                >
                  查看申诉
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.06] p-10 backdrop-blur-xl">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/60">准备好了</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                让合作变得更确定
              </h3>
              <p className="mt-2 text-sm text-white/70">
                如果你希望首页文案更贴合品牌（公司名/定位/核心优势），我可以按你的描述再做一轮精修。
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="h-12 w-full rounded-full bg-white px-8 text-black hover:bg-white/90 sm:w-auto">
                  立即登录
                </Button>
              </Link>
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/15 bg-white/5 px-8 text-white/90 hover:bg-white/10 sm:w-auto"
                >
                  成为伙伴
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-white/45">
          © {new Date().getFullYear()} 航向标合作伙伴服务系统 · Premium Partner Operations
        </p>
      </main>
    </div>
  );
}
