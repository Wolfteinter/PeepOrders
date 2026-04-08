import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

type Prize = {
  label: string;
  detail: string;
};

const prizes: Prize[] = [
  {
    label: '10% descuento',
    detail: 'Aplica un 10% de descuento en tu compra.',
  },
  {
    label: 'Bolsa sorpresa',
    detail: 'Te llevas una bolsa sorpresa con un detalle especial.',
  },
  {
    label: 'Suerte para la proxima',
    detail: 'Esta vez no cayó premio, pero siempre hay otra vuelta.',
  },
  {
    label: 'Suerte para la proxima',
    detail: 'Esta vez no cayó premio, pero siempre hay otra vuelta.',
  },
  {
    label: 'Suerte para la proxima',
    detail: 'Esta vez no cayó premio, pero siempre hay otra vuelta.',
  },
  {
    label: 'Llavero de 30 pesos',
    detail: 'Ganaste un llavero con valor de 30 pesos.',
  },
];

const wheelColors = ['#f08c42', '#8ac84b', '#f3d44a', '#4aa98f'];
const spinDurationMs = 4800;

function shufflePrizes(items: Prize[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

export function RuletaPage() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [wheelPrizes, setWheelPrizes] = useState(() => shufflePrizes(prizes));
  const timeoutRef = useRef<number | null>(null);
  const segmentAngle = 360 / wheelPrizes.length;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleSpin() {
    if (isSpinning) {
      return;
    }

    const nextWheelPrizes = shufflePrizes(prizes);
    const prizeIndex = Math.floor(Math.random() * nextWheelPrizes.length);
    const currentRotation = ((rotation % 360) + 360) % 360;
    const targetCenter = prizeIndex * segmentAngle + segmentAngle / 2;
    const targetRotation = (360 - targetCenter) % 360;
    let delta = (targetRotation - currentRotation + 360) % 360;

    if (delta === 0) {
      delta = 360;
    }

    setSelectedPrize(null);
    setIsSpinning(true);
    setWheelPrizes(nextWheelPrizes);
    setRotation(rotation + 6 * 360 + delta);

    timeoutRef.current = window.setTimeout(() => {
      setSelectedPrize(nextWheelPrizes[prizeIndex]);
      setIsSpinning(false);
    }, spinDurationMs);
  }

  return (
    <section className="ruleta-page">
      <div className="panel ruleta-stage-panel">
        <div className="ruleta-toolbar">
          <Link to="/" className="ghost-button">
            Volver
          </Link>
        </div>

        <div className="ruleta-stage">
          <div className="ruleta-pointer" aria-hidden="true" />

          <div
            className="ruleta-wheel"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.8, 0.18, 1)`
                : 'none',
              background: `conic-gradient(${prizes
                .map((_, index) => {
                  const color = wheelColors[index % wheelColors.length];
                  const start = index * segmentAngle;
                  const end = start + segmentAngle;
                  return `${color} ${start}deg ${end}deg`;
                })
                .join(', ')})`,
            }}
          >
            {wheelPrizes.map((prize, index) => {
              const angle = index * segmentAngle + segmentAngle / 2;

              return (
                <span
                  key={`${prize.label}-${index}`}
                  className="ruleta-segment-label"
                  style={{
                    transform:
                      `translate(-50%, -50%) rotate(${angle}deg) ` +
                      'translateY(-164px) ' +
                      `rotate(${-angle}deg)`,
                  }}
                >
                  {prize.label}
                </span>
              );
            })}

            <button
              type="button"
              className="ruleta-center ruleta-center-button"
              onClick={handleSpin}
              disabled={isSpinning}
            >
              {isSpinning ? 'Girando...' : 'Girar'}
            </button>
          </div>
        </div>

      </div>

      {selectedPrize ? (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedPrize(null)}
          role="presentation"
        >
          <div
            className="modal-card modal-card-compact ruleta-result-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Premio: ${selectedPrize.label}`}
          >
            <button
              type="button"
              className="ghost-button modal-corner-close"
              onClick={() => setSelectedPrize(null)}
            >
              Cerrar
            </button>

            <div className="ruleta-result-modal-content">
              <span className="eyebrow">Premio</span>
              <h2>{selectedPrize.label}</h2>
              <p>{selectedPrize.detail}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
