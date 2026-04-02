import { useState } from 'react';
import { Sparkles, Loader2, TrendingUp, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { scoreCandidate, MatchScore } from '../services/nvidia';

interface AICandidateScoreProps {
  candidateName: string;
  candidateSkills: string[];
  candidateAbout?: string;
  jobTitle: string;
  jobDescription?: string;
  jobRequirements?: string[];
}

export default function AICandidateScore({
  candidateName,
  candidateSkills,
  jobTitle,
  jobDescription,
  jobRequirements,
  candidateAbout,
}: AICandidateScoreProps) {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<MatchScore | null>(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleScore = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await scoreCandidate({
        candidateName,
        candidateSkills,
        candidateAbout,
        jobTitle,
        jobDescription,
        jobRequirements,
      });
      setScore(result);
      setShowDetails(true);
    } catch (err: any) {
      console.error('Scoring Error:', err);
      setError(err.message || 'Failed to score candidate.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 85) return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', bar: 'bg-emerald-500' };
    if (s >= 70) return { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300', bar: 'bg-blue-500' };
    if (s >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-300', bar: 'bg-amber-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300', bar: 'bg-red-500' };
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'Strongly Recommended':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Recommended':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Consider':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  return (
    <div>
      {/* Trigger Button */}
      <button
        onClick={handleScore}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 disabled:opacity-50 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-600 border border-purple-200 hover:from-purple-100 hover:to-indigo-100 hover:shadow-sm active:scale-95"
        title={`AI Match Score for ${candidateName}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Scoring...
          </>
        ) : score ? (
          <>
            <TrendingUp className="w-3.5 h-3.5" />
            {score.score}%
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            AI Score
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 font-medium mt-1">{error}</p>
      )}

      {/* Score Details Modal/Popover */}
      {showDetails && score && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">AI Match Analysis</h3>
                <p className="text-sm text-slate-500">{candidateName} → {jobTitle}</p>
              </div>
              <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Score Circle */}
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${getScoreColor(score.score).bg} ring-4 ${getScoreColor(score.score).ring}`}>
                <span className={`text-2xl font-black ${getScoreColor(score.score).text}`}>{score.score}</span>
              </div>
              <div className="flex-1">
                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                  <div className={`h-2.5 rounded-full transition-all duration-1000 ${getScoreColor(score.score).bar}`} style={{ width: `${score.score}%` }} />
                </div>
                <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${getRecommendationBadge(score.recommendation)}`}>
                  {score.recommendation}
                </span>
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
              {score.summary}
            </p>

            {/* Strengths */}
            <div>
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Strengths
              </h4>
              <ul className="space-y-1.5">
                {score.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps */}
            <div>
              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Areas to Improve
              </h4>
              <ul className="space-y-1.5">
                {score.gaps.map((g, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">Powered by NVIDIA NIM • Llama 3.1</p>
              <button
                onClick={() => { setScore(null); setShowDetails(false); handleScore(); }}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                Re-analyze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
