/* ================= impact feel ================= */
// hit marker on the reticle, FOV "punch" that holds through hit-stop, low-frequency thud layered under hits
function impactPunch(k){S.punch=Math.max(S.punch||0,k)}
function hitMark(kind){const h=document.getElementById("hitm");if(!h)return;h.className="";void h.offsetWidth;h.className=kind||"hit"}
