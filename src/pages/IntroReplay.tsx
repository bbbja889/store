import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useExperience } from '@/state/experience';

/** /intro — replays the full film, then lands on the home page. */
export default function IntroReplay() {
  const replay = useExperience((s) => s.replayIntro);
  useEffect(() => {
    replay();
  }, [replay]);
  return <Navigate to="/" replace />;
}
