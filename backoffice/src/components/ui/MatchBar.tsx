export default function MatchBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="bo-match-track flex-1">
        <div className="bo-match-fill" style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold">{score}%</span>
    </div>
  );
}
