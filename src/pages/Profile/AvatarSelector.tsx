import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";

const AvatarSelector = () => {
  const navigate = useNavigate();
  const [selectedAvatar, setSelectedAvatar] = useState("");

  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=farmer1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=farmer2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=farmer3",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=farmer4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=dairy1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=dairy2",
    "https://api.dicebear.com/7.x/bottts/svg?seed=cow1",
    "https://api.dicebear.com/7.x/bottts/svg?seed=cow2",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=happy1",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=happy2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=mary",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    "https://api.dicebear.com/7.x/bottts/svg?seed=robot1",
    "https://api.dicebear.com/9.x/open-peeps/svg?seed=Christian",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=smile1",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=smile2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    "https://api.dicebear.com/7.x/bottts/svg?seed=bot1",
    "https://api.dicebear.com/7.x/bottts/svg?seed=bot2",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=cool1",
    "https://api.dicebear.com/9.x/personas/svg?seed=Alexander"
  ];

  useEffect(() => {
    const savedAvatar = localStorage.getItem("userAvatar");
    if (savedAvatar) setSelectedAvatar(savedAvatar);
  }, []);

  const handleSave = () => {
    if (selectedAvatar) {
      localStorage.setItem("userAvatar", selectedAvatar);
      navigate("/dashboard/profile");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/profile")}
            className="hover:bg-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Choose Your Avatar</h1>
            <p className="text-gray-600">Select a farmer-themed avatar for your profile</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 mb-8">
            {avatars.map((avatar) => (
              <button
                key={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative w-20 h-20 rounded-xl transition-all hover:scale-110 overflow-hidden ${
                  selectedAvatar === avatar
                    ? "ring-4 ring-blue-500 scale-110"
                    : "ring-2 ring-gray-200 hover:ring-gray-300"
                }`}
              >
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                {selectedAvatar === avatar && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleSave}
              disabled={!selectedAvatar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              Save Avatar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;
