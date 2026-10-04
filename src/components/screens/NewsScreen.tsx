import { useGameStore } from '../../store/gameStore';
import { Card, Badge } from '../ui/Card';

function categoryColor(cat: string) {
  switch (cat) {
    case 'award': return 'yellow';
    case 'chart': return 'blue';
    case 'beef': return 'red';
    case 'feature': return 'green';
    case 'show': return 'purple';
    case 'scandal': return 'orange';
    case 'business': return 'blue';
    default: return 'gray';
  }
}

function categoryEmoji(cat: string) {
  switch (cat) {
    case 'award': return '🏆';
    case 'chart': return '📈';
    case 'beef': return '🔥';
    case 'feature': return '🎵';
    case 'show': return '🎭';
    case 'scandal': return '💥';
    case 'business': return '💼';
    default: return '📰';
  }
}

export function NewsScreen() {
  const { headlines, socialPosts, openThreads } = useGameStore();

  const sortedHeadlines = [...headlines].sort((a, b) => b.priority - a.priority);
  const activeThreads = openThreads.filter(t => !t.resolved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          📰 News Feed
        </h1>
        <p className="text-gray-500 text-sm">What's happening in your world</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {sortedHeadlines.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📰</div>
                <p className="text-gray-500 text-sm">No news yet. Release music and make moves to generate headlines.</p>
              </div>
            </Card>
          ) : (
            sortedHeadlines.slice(0, 20).map(headline => (
              <Card key={headline.id} className="hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{categoryEmoji(headline.category)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge color={categoryColor(headline.category) as any}>
                        {headline.category}
                      </Badge>
                      <span className="text-xs text-gray-600">{headline.date}</span>
                      {headline.priority >= 7 && (
                        <Badge color="red">🔥 Breaking</Badge>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1">{headline.text}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{headline.fullStory}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Trending on Chirp */}
          <Card>
            <h3 className="font-bold text-white text-sm mb-3">🐦 Trending on Chirp</h3>
            {socialPosts
              .filter(p => p.platform === 'chirp' && p.trendingScore > 20)
              .sort((a, b) => b.trendingScore - a.trendingScore)
              .slice(0, 5)
              .map(post => (
                <div key={post.id} className="mb-3 pb-3 border-b border-gray-800 last:border-0">
                  <div className="text-xs font-bold text-gray-300 truncate">{post.authorName}</div>
                  <div className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{post.content}</div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-600">
                    <span>❤️ {post.likes}</span>
                    <span>🔁 {post.shares}</span>
                    <span>💬 {post.comments.length}</span>
                  </div>
                </div>
              ))}
            {socialPosts.filter(p => p.platform === 'chirp' && p.trendingScore > 20).length === 0 && (
              <p className="text-gray-600 text-xs text-center py-3">Nothing trending yet</p>
            )}
          </Card>

          {/* Open Storylines */}
          <Card>
            <h3 className="font-bold text-white text-sm mb-3">🕵️ Storylines</h3>
            {activeThreads.length === 0 ? (
              <p className="text-gray-600 text-xs">Nothing developing right now.</p>
            ) : (
              activeThreads.slice(0, 5).map(thread => (
                <div key={thread.id} className="mb-2 pb-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm">
                      {thread.type === 'beef' ? '🔥' : thread.type === 'romance' ? '💕' : thread.type === 'deal' ? '💼' : thread.type === 'legal' ? '⚖️' : '📌'}
                    </span>
                    <span className="text-xs text-gray-300">{thread.description}</span>
                  </div>
                  <div className="flex gap-1">
                    <Badge color={thread.priority >= 7 ? 'red' : 'gray'}>
                      Priority {thread.priority}
                    </Badge>
                    {thread.escalationCount > 0 && (
                      <Badge color="orange">Escalated {thread.escalationCount}×</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
