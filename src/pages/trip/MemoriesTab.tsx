interface Props {
  tripId: string;
  viewOnly?: boolean;
}

export function MemoriesTab({ tripId: _tripId, viewOnly: _viewOnly }: Props) {
  void _tripId;
  void _viewOnly;

  return (
    <div>
      <div className="empty-state">
        <p>還沒有回憶</p>
      </div>
    </div>
  );
}
