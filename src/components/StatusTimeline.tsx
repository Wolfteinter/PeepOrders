import { orderStatuses, statusLabelMap, type OrderStatus } from '../types/order';

interface StatusTimelineProps {
  currentStatus: OrderStatus;
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const activeIndex = orderStatuses.indexOf(currentStatus);

  return (
    <div className="timeline">
      {orderStatuses.map((status, index) => {
        const isDone = index <= activeIndex;
        const isLast = index === orderStatuses.length - 1;
        return (
          <div
            key={status}
            className={`timeline-step ${isDone ? 'active' : ''} ${isLast ? 'last' : ''}`}
          >
            <span className="timeline-dot" />
            <div className="timeline-copy">
              <strong>{statusLabelMap[status]}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}
