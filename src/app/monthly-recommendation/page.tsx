// app/monthly-recommendation/page.tsx
"use client";

import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tag } from '../components/ui/Tag';
import { MapPin, Music, BookOpen, Quote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const MonthlyRecommendationPage = () => {
  const router = useRouter();

  // 月度推荐数据
  const monthlyData = {
    hero: {
      image: "/logo.png",
      caption: "六月，是毕业的季节，也是告别与启程的季节。愿你前程似锦，归来仍是少年。",
      date: "2024年6月"
    },
    music: {
      title: "不说再见",
      artist: "好妹妹乐队",
      album: "不说再见",
      duration: "4:32"
    },
    quote: {
      text: "我们总以为，是生活欠我们一个满意，其实，是我们欠生活一个努力。",
      author: "— 佚名"
    },
    book: {
      title: "《围城》",
      author: "钱钟书",
      description: "婚姻是座围城，城外的人想进去，城里的人想出来。一本关于生活、婚姻与人性的深刻剖析。",
      tags: ["经典", "文学", "人生哲理"]
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定的头部区域 - 毛玻璃圆角矩形模块 */}
      <div className="sticky top-0 z-20 py-4 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-blue-100/70 via-white/70 to-orange-100/70 rounded-3xl shadow-lg border border-orange-200 backdrop-blur-md">
          {/* 标题和按钮行 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">月度推荐</h2>
              <p className="text-gray-500 mt-1">每月精选，与你分享美好</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => {}}
                className="flex items-center gap-1"
              >
                <Quote size={16} /> 
                往期回顾
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1">
        <div className="p-4 pt-0">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 gap-6">
              {/* Hero Section */}
              <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200">
                <div className="relative w-full h-64 rounded-2xl overflow-hidden mb-4">
                  <Image
                    src={monthlyData.hero.image}
                    alt="月度推荐封面"
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                </div>
                <p className="text-center text-lg text-gray-700 font-medium">
                  {monthlyData.hero.caption}
                </p>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {monthlyData.hero.date}
                </p>
              </Card>

              {/* Music Recommendation */}
              <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200">
                <div className="flex items-center gap-4 mb-4">
                  <Music className="text-orange-500" size={24} />
                  <h3 className="text-xl font-semibold text-gray-800">音乐推荐</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 to-blue-200 flex items-center justify-center">
                    <Image
                      src={monthlyData.hero.image}
                      alt="专辑封面"
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800">{monthlyData.music.title}</h4>
                    <p className="text-gray-600">{monthlyData.music.artist}</p>
                    <p className="text-sm text-gray-500">{monthlyData.music.album} • {monthlyData.music.duration}</p>
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Music size={16} />
                    播放
                  </Button>
                </div>
              </Card>

              {/* Quote Section */}
              <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200">
                <div className="flex items-center gap-4 mb-4">
                  <Quote className="text-orange-500" size={24} />
                  <h3 className="text-xl font-semibold text-gray-800">每日一言</h3>
                </div>
                <blockquote className="text-center">
                  <p className="text-xl font-medium text-gray-800 italic mb-4">
                    {`"${monthlyData.quote.text}"`}
                  </p>
                  <p className="text-gray-600">
                    {monthlyData.quote.author}
                  </p>
                </blockquote>
              </Card>

              {/* Book Recommendation */}
              <Card className="bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 p-6 rounded-3xl shadow-lg border border-orange-200">
                <div className="flex items-center gap-4 mb-4">
                  <BookOpen className="text-orange-500" size={24} />
                  <h3 className="text-xl font-semibold text-gray-800">书籍推荐</h3>
                </div>
                <div className="flex gap-6">
                  <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center">
                    <Image
                      src={monthlyData.hero.image}
                      alt="书籍封面"
                      width={96}
                      height={128}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-800 mb-2">{monthlyData.book.title}</h4>
                    <p className="text-gray-600 mb-3">{monthlyData.book.author}</p>
                    <p className="text-gray-700 mb-4">{monthlyData.book.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {monthlyData.book.tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyRecommendationPage;