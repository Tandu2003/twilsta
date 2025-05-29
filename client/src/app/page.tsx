import MainLayout from '@/components/layout';

export default function Home() {
  return (
    <MainLayout>
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-3xl font-bold text-red-500 underline">Hello World</div>
      </div>
    </MainLayout>
  );
}
