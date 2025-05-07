// 这个文件包含辅助函数，用于在使用客户端组件的页面中启用服务器渲染
import { GetServerSideProps } from 'next';

// 导出一个通用的GetServerSideProps函数，确保页面始终使用SSR而不是静态生成
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {
      // 传递当前时间戳确保每次请求都是唯一的，避免静态生成
      serverTime: Date.now(),
    },
  };
};

// 用于客户端组件的Props类型
export interface StaticPageProps {
  serverTime?: number;
}

// 导出默认属性
export const defaultStaticPageProps: StaticPageProps = {
  serverTime: Date.now(),
}; 