import { NjikoMark } from './NjikoMark';
import { Wordmark } from './Wordmark';

export function SplashScreen() {
  return (
    <div className="njk-splash">
      <div className="njk-splash-in">
        <NjikoMark size={104} className="njk-splash-mark" />
        <Wordmark className="njk-splash-name" />
        <div className="njk-splash-by">By Chivera</div>
      </div>
    </div>
  );
}
