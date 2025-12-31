import logo from '@/assets/NeoDairy_Logo.png';

interface PdfLoaderProps {
  isLoading: boolean;
}

const PdfLoader = ({ isLoading }: PdfLoaderProps) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/10 flex items-center justify-center z-50">
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg">
        <img src={logo} alt="Loading" className="h-20 w-20 animate-spin" />
      </div>
    </div>
  );
};

export default PdfLoader;
