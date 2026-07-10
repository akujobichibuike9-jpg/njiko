export function Earnings() {
  return (
    <>
      <div className="m-header"><span className="page-title">Earnings</span></div>
      <div className="m-body">
        <div className="bal-card">
          <div className="bl">Available to withdraw</div>
          <div className="bv">₦0</div>
          <button className="wbtn">Withdraw to bank</button>
        </div>
        <div className="empty">
          <div className="et">No earnings yet</div>
          <div className="ed">Completed orders will show up here with your payouts.</div>
        </div>
      </div>
    </>
  );
}
