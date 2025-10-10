// app/monthly-recommendation/page.tsx
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const MonthlyRecommendationPage = () => {
  const router = useRouter();

  const handleBackToMain = () => {
    router.push('/main?page=moments');
  };

  return (
    <>
      <div className="page-container">
        <header className="page-header">
          <h1 className="header-title">月度推荐</h1>
          <button 
            className="menu-icon"
            onClick={() => router.push('/main?page=moments')}
            aria-label="返回首页"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 12H21"
                stroke="#333"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 6H21"
                stroke="#333"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 18H21"
                stroke="#333"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <main className="content-wrapper">
          {/* Section 1: Hero Image & Caption */}
          <section className="card-section">
            <div className="image-container">
              <Image
                src="/logo.png" // 修正：不需要 /public/ 前缀
                alt="Winding road in lush green mountains"
                width={800}
                height={450}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                priority
              />
            </div>
            <p className="caption-text">
              六月，是毕业的季节，也是告别与启程的季节。愿你前程似锦，归来仍是少年。
            </p>
          </section>

          {/* Section 2: Music Player */}
          <section className="music-section">
            <div className="vinyl-container">
              <div className="vinyl-image-wrapper">
                <Image
                  src="/logo.png" // 使用相同的 logo.png
                  alt="Concert crowd"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="vinyl-center"></div>
            </div>
            <div className="song-info">
              <div>
                <p className="song-title">不说再见</p>
                <p className="song-artist">好妹妹乐队</p>
              </div>
              <div className="play-button">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 5V19L19 12L8 5Z" />
                </svg>
              </div>
            </div>
          </section>

          {/* Section 3: Quote */}
          <section className="quote-section">
            <p className="quote-text">
              我们总以为，是生活欠我们一个满意，其实，是我们欠生活一个努力。
            </p>
            <p className="quote-author">— 佚名</p>
          </section>

          {/* Section 4: Book Recommendation */}
          <section className="card-section">
            <div className="book-card">
              <p className="book-card-subtitle">本月推荐书籍</p>
              <h2 className="book-title">《围城》</h2>
              <p className="book-author">钱钟书</p>
              <p className="book-description">
                婚姻是座围城，城外的人想进去，城里的人想出来。一本关于生活、婚姻与人性的深刻剖析。
              </p>
            </div>
          </section>
        </main>

        <footer className="page-footer">
          <p>— END —</p>
        </footer>
      </div>

      <style jsx>{`
        /* 保持原有的样式，可以添加一些交互样式 */
        .menu-icon {
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .menu-icon:hover {
          opacity: 0.7;
        }
        
        .play-button {
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .play-button:hover {
          background-color: #f0f0f0;
          transform: scale(1.05);
        }
        
        /* 其他样式保持不变 */
        .page-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Source Han Serif CN', 'Noto Serif SC', serif;
          color: #333;
          background-color: #fff;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
        }

        .header-title {
          font-size: 1.2rem;
          font-weight: normal;
          letter-spacing: 2px;
        }

        .content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4rem;
        }

        .card-section {
          width: 100%;
          margin: 2rem 0;
        }

        .image-container {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .caption-text {
          text-align: center;
          padding: 2rem 1rem;
          font-size: 0.95rem;
          color: #555;
          line-height: 1.8;
        }

        .music-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin: 3rem 0;
        }

        .vinyl-container {
          position: relative;
          width: 250px;
          height: 250px;
        }

        .vinyl-image-wrapper {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        
        .vinyl-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70px;
          height: 70px;
          background-color: #fff;
          border-radius: 50%;
          border: 10px solid #000;
        }

        .song-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 250px;
        }
        .song-title {
          font-size: 1.1rem;
          font-weight: bold;
          margin: 0;
        }
        .song-artist {
          font-size: 0.9rem;
          color: #666;
          margin: 4px 0 0;
        }
        .play-button {
          width: 40px;
          height: 40px;
          border: 1px solid #ccc;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #333;
          transition: background-color 0.2s;
        }
        .play-button:hover {
          background-color: #f0f0f0;
        }
        .play-button svg {
          margin-left: 3px;
        }
        
        .quote-section {
          text-align: center;
          padding: 3rem 1rem;
          margin: 2rem 0;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
        }
        .quote-text {
          font-size: 1.5rem;
          font-weight: bold;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .quote-author {
          font-size: 1rem;
          color: #777;
        }
        
        .book-card {
          background-color: #f9f9f9;
          padding: 2.5rem;
          border-radius: 8px;
          text-align: center;
        }
        .book-card-subtitle {
          font-size: 0.9rem;
          color: #888;
          margin-bottom: 1rem;
        }
        .book-title {
          font-size: 1.8rem;
          margin: 0.5rem 0;
        }
        .book-author {
          font-size: 1rem;
          color: #666;
          margin-bottom: 2rem;
        }
        .book-description {
          font-size: 1rem;
          line-height: 1.8;
          color: #444;
        }

        .page-footer {
          text-align: center;
          padding: 4rem 0 2rem;
          color: #aaa;
          letter-spacing: 2px;
          font-size: 0.9rem;
        }

        @media (max-width: 640px) {
          .page-container {
            padding: 15px;
          }
          .content-wrapper {
            gap: 2.5rem;
          }
          .quote-text {
            font-size: 1.2rem;
          }
          .book-card {
            padding: 1.5rem;
          }
          .book-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default MonthlyRecommendationPage;