import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Dynamic page config (retained from previous version)
export const dynamic = 'force-dynamic'; 
export const fetchCache = 'force-no-store'; 
export const revalidate = 0; 
export const dynamicParams = true; 

const FeatureCard = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
  <div className="group bg-white/10 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center">
    <div className="mb-4 p-3 rounded-full bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-indigo-400/20 w-16 h-16 flex items-center justify-center">
      <span className="text-3xl text-white transition-transform duration-300 ease-in-out group-hover:scale-110">{icon}</span>
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-sm text-indigo-100 dark:text-indigo-200 leading-relaxed">{description}</p>
  </div>
);

export default function HomePage() {
  return (
    <div className="antialiased min-h-screen flex flex-col bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white dark:from-indigo-800 dark:via-purple-800 dark:to-indigo-900">
      {/* Top Navigation */}
      <nav className="w-full p-4 sm:p-6 bg-black/10 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            <span role="img" aria-label="anchor" className="mr-2 text-2xl sm:text-3xl align-middle">⚓</span>
            <span className="align-middle">航向标合作伙伴服务系统</span>
          </h1>
          <Link href="/login">
            <Button variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:hover:border-white/40 rounded-full px-6 py-2 text-sm sm:text-base transition-all duration-300">
              立即登录
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <section className="text-center mb-16 sm:mb-20 md:mb-24">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            智慧引领，共创价值
          </h2>
          <p className="text-lg sm:text-xl text-indigo-100 dark:text-indigo-200 max-w-3xl mx-auto leading-relaxed">
            数据驱动决策，让每一次合作都更有意义。
            在瞬息万变的商业海洋中，我们是您的航向标， 用数据照亮前行的路，用智慧点燃合作的火。
          </p>
        </section>

        {/* Feature Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-16 sm:mb-20 md:mb-24">
          <FeatureCard icon="📊" title="数据看板" description="实时洞察业务全貌，数据即决策，让每个数字都成为您成功的密码。" />
          <FeatureCard icon="🎯" title="客户报备" description="一键锁定商机，先到先得，让机会永远属于有准备的人。" />
          <FeatureCard icon="⚖️" title="冲突申诉" description="公正如天平，透明如水晶，让每一份努力都得到应有的回报。" />
          <FeatureCard icon="🔍" title="客户跟踪" description="从接触到成交，全程可视化，让每一步都踏在成功的节拍上。" />
        </section>

        {/* "因为相信，所以看见" Section */}
        <section className="bg-white/10 dark:bg-white/5 backdrop-blur-md p-8 sm:p-10 md:p-12 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 text-center mb-16 sm:mb-20 md:mb-24">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">因为相信，所以看见</h2>
          <p className="text-base sm:text-lg text-indigo-100 dark:text-indigo-200 max-w-2xl mx-auto leading-relaxed">
            真正的合作不是分割利益，而是创造价值。我们相信，当数据成为罗盘，智慧成为风帆，
            每一次合作都将驶向更广阔的蓝海。在这里，您不只是合作伙伴，更是共同追梦的航海者。
          </p>
        </section>
      </main>

      {/* Footer with CTA */}
      <footer className="w-full p-6 sm:p-8 text-center bg-black/10 backdrop-blur-md">
        <div className="container mx-auto flex flex-col items-center">
          <Link href="/" className="mb-6 sm:mb-8">
            <Button size="lg" className="bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold px-10 sm:px-12 py-3 sm:py-4 text-lg rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              点亮您的航向标
            </Button>
          </Link>
          <p className="text-xs sm:text-sm text-indigo-200 dark:text-indigo-300">
            © {new Date().getFullYear()} 航向标合作伙伴服务系统. 智慧引领，共创价值.
          </p>
        </div>
      </footer>
    </div>
  );
}
