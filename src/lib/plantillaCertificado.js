export const PLANTILLA_CERTIFICADO = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Certificado · Staff and Services SAS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --azul-medianoche:#0F0F29; --azul-abismo:#07070F; --ceruleo:#0378A8;
    --gris-niebla:#F2F3F5; --linea:#D7DBE2; --tinta:#0F0F29;
    --tinta-60:#4A5470; --tinta-45:#79819A; --blanco:#FFFFFF;
  }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html,body{ background:#FFFFFF; font-family:"Poppins",system-ui,sans-serif; }

  .page{ position:relative; width:279.4mm; height:215.9mm; background:var(--blanco);
    margin:0 auto; overflow:hidden; color:var(--tinta);
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .spine{ position:absolute; top:0; left:0; bottom:0; width:15mm;
    background:linear-gradient(180deg,var(--azul-abismo) 0%,var(--azul-medianoche) 42%,#024e75 82%,var(--ceruleo) 100%); z-index:3; }
  .spine__mark{ position:absolute; top:8mm; left:50%; transform:translateX(-50%); width:9mm; }
  .spine__mark img{ width:100%; height:auto; display:block; }
  .folio-wrap{ position:absolute; bottom:26mm; left:50%; transform:translateX(-50%) rotate(-90deg); transform-origin:center; white-space:nowrap; display:flex; flex-direction:column; align-items:center; gap:1mm; }
  .folio-wrap .lbl{ font-size:6pt; letter-spacing:.42em; text-transform:uppercase; color:rgba(255,255,255,.6); font-weight:500; margin:0; line-height:1; }
  .folio-wrap .num{ font-size:9.5pt; font-weight:600; letter-spacing:.1em; color:#fff; margin:0; line-height:1; }

  .iso-wm{ position:absolute; top:52%; left:calc(50% + 7mm); transform:translate(-50%,-50%); width:105mm; opacity:.05; z-index:1; pointer-events:none; }
  .iso-wm img{ width:100%; height:auto; display:block; }

  .frame{ position:absolute; top:6mm; right:6mm; bottom:6mm; left:21mm; border:1.4pt solid var(--azul-medianoche); z-index:2; pointer-events:none; }
  .frame::after{ content:""; position:absolute; inset:2.2mm; border:.5pt solid var(--ceruleo); }

  .content{ position:absolute; top:6mm; right:6mm; bottom:6mm; left:21mm; padding:10mm 12mm 8mm; z-index:4; display:flex; flex-direction:column; }
  .eyebrow{ font-size:7pt; font-weight:500; text-transform:uppercase; letter-spacing:.42em; color:var(--ceruleo); }

  .head{ display:flex; justify-content:space-between; align-items:flex-start; }
  .brand{ display:flex; align-items:center; gap:4mm; }
  .brand__iso{ width:27mm; flex:none; }
  .brand__iso img{ width:100%; height:auto; display:block; }
  .brand__txt .name{ font-size:11pt; font-weight:600; letter-spacing:.02em; line-height:1.1; }
  .brand__txt .nit{ font-size:7.5pt; color:var(--tinta-60); margin-top:.5mm; }
  .accred{ text-align:right; background:var(--gris-niebla); border-left:2pt solid var(--ceruleo); padding:2.5mm 4mm; max-width:78mm; }
  .accred .a-lbl{ font-size:6pt; letter-spacing:.32em; text-transform:uppercase; color:var(--tinta-45); font-weight:500; }
  .accred .a-val{ font-size:7.5pt; color:var(--tinta); line-height:1.45; margin-top:1mm; }
  .accred .a-val b{ font-weight:600; }

  .title{ text-align:center; margin-top:7mm; }
  .title .eyebrow{ display:block; letter-spacing:.2em; }
  .title h1{ font-size:25pt; font-weight:600; letter-spacing:.04em; color:var(--azul-medianoche); margin-top:2mm; line-height:1; }
  .title .rule{ width:34mm; height:1.4pt; background:var(--ceruleo); margin:3mm auto 0; }

  .certifica{ text-align:center; margin-top:6mm; }
  .certifica .eyebrow{ display:block; margin-bottom:2.5mm; }
  .name{ font-size:30pt; font-weight:600; color:var(--azul-medianoche); letter-spacing:.02em; line-height:1; text-transform:uppercase; }
  .doc{ font-size:10pt; color:var(--tinta-60); margin-top:2.5mm; letter-spacing:.02em; }

  .course{ margin-top:6mm; background:var(--gris-niebla); border-left:3pt solid var(--ceruleo); padding:4mm 6mm; text-align:center; }
  .course .cumpliendo{ font-size:8.5pt; color:var(--tinta-60); margin-bottom:2.5mm; }
  .course .cumpliendo b{ color:var(--azul-medianoche); font-weight:600; }
  .course .pre{ font-size:8.5pt; color:var(--tinta-60); }
  .course .curso{ font-size:16pt; font-weight:600; color:var(--azul-medianoche); letter-spacing:.03em; margin-top:1.5mm; text-transform:uppercase; }

  .details{ margin-top:5.5mm; display:grid; grid-template-columns:1fr 1fr; gap:0 10mm; }
  .col .col__lbl{ font-size:6.5pt; letter-spacing:.32em; text-transform:uppercase; color:var(--ceruleo); font-weight:500; padding-bottom:1.5mm; border-bottom:.5pt solid var(--linea); margin-bottom:2mm; }
  .row{ display:flex; font-size:8pt; line-height:1.55; }
  .row .k{ width:32mm; color:var(--tinta-45); flex:none; }
  .row .v{ color:var(--tinta); font-weight:500; }
  .narr{ font-size:8pt; line-height:1.6; color:var(--tinta); text-align:left; }
  .narr b{ color:var(--azul-medianoche); font-weight:600; }
  .narr p+p{ margin-top:2mm; }

  .sign{ margin-top:auto; display:grid; grid-template-columns:1fr auto 1fr; gap:0 8mm; align-items:end; padding-top:6mm; }
  .fbox{ text-align:center; }
  .fbox .ink{ height:16mm; display:flex; align-items:flex-end; justify-content:center; }
  .fbox .ink img{ max-height:16mm; max-width:60mm; display:block; }
  .fbox .line{ border-top:.75pt solid var(--tinta); padding-top:1.5mm; }
  .fbox .who{ font-size:9pt; font-weight:600; color:var(--azul-medianoche); }
  .fbox .role{ font-size:7pt; color:var(--tinta-60); margin-top:.5mm; }

  .qr{ text-align:center; }
  .qr__frame{ width:24mm; height:24mm; margin:0 auto; }
  .qr__frame img{ width:100%; height:100%; display:block; }
  .qr .qlbl{ font-size:6pt; letter-spacing:.2em; text-transform:uppercase; color:var(--tinta-45); margin-top:1.5mm; }
  .qr .qurl{ font-size:6.5pt; color:var(--ceruleo); margin-top:.5mm; }

  .addr{ text-align:center; font-size:6.5pt; color:var(--tinta-45); margin-top:5mm; letter-spacing:.01em; }
  .addr b{ color:var(--tinta-60); font-weight:500; }

  @page{ size:279.4mm 215.9mm; margin:0; }
  @media print{
    html,body{ background:#fff; }
    .page{ margin:0; box-shadow:none; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="spine">
      <div class="spine__mark"><img src="{{ISOTIPO_BLANCO}}" alt=""></div>
      <div class="folio-wrap">
        <div class="lbl">Folio</div>
        <div class="num">{{folio}}</div>
      </div>
    </div>

    <div class="iso-wm"><img src="{{ISOTIPO_MARCA}}" alt=""></div>

    <div class="frame"></div>

    <div class="content">
      <div class="head">
        <div class="brand">
          <div class="brand__iso"><img src="{{LOGO_OFICIAL}}" alt=""></div>
          <div class="brand__txt">
            <div class="name">STAFF AND SERVICES SAS</div>
            <div class="nit">NIT 900.870.257-2</div>
          </div>
        </div>
        <div class="accred">
          <div class="a-lbl">Acreditación</div>
          <div class="a-val">Bureau Veritas <b>09-CPR-008</b><br>Certificación N.° <b>CO25.00206</b></div>
        </div>
      </div>

      <div class="title">
        <span class="eyebrow">Certificado de capacitación y entrenamiento para</span>
        <h1>TRABAJO EN ALTURAS</h1>
        <div class="rule"></div>
      </div>

      <div class="certifica">
        <span class="eyebrow">Certifica que</span>
        <div class="name">{{nombre}}</div>
        <div class="doc">{{tipoDocumento}} N.° {{documento}}</div>
      </div>

      <div class="course">
        <div class="cumpliendo">Cumpliendo con lo establecido en la <b>Resolución 4272 de 2021</b></div>
        <div class="pre">Cursó y aprobó la capacitación y entrenamiento en</div>
        <div class="curso">{{curso}}</div>
      </div>

      <div class="details">
        <div class="col">
          <div class="col__lbl">Datos laborales</div>
          <div class="row"><span class="k">Empresa</span><span class="v">{{empresa}}</span></div>
          <div class="row"><span class="k">NIT</span><span class="v">{{empresaNit}}</span></div>
          <div class="row"><span class="k">Representante legal</span><span class="v">{{repLegal}}</span></div>
          <div class="row"><span class="k">ARL</span><span class="v">{{arl}}</span></div>
        </div>
        <div class="col">
          <div class="col__lbl">Realización</div>
          <div class="narr">
            <p>Realizado en Bogotá D.C. del ({{diaInicio}}) del mes de {{mesInicio}} de {{anioInicio}} al ({{diaFin}}) del mes de {{mesFin}} de {{anioFin}} con una intensidad de <b>{{horas}}</b>.</p>
            <p>En testimonio de lo anterior, se firma en Bogotá D.C. a los ({{diaFirma}}) del mes de {{mesFirma}} de {{anioFirma}}.</p>
          </div>
        </div>
      </div>

      <div class="sign">
        <div class="fbox">
          <div class="ink">{{FIRMA_REPLEGAL}}</div>
          <div class="line">
            <div class="who">Sonia Elizabeth Herrera Bello</div>
            <div class="role">Representante Legal · Staff and Services SAS</div>
          </div>
        </div>
        <div class="qr">
          <div class="qr__frame">{{QR_IMAGEN}}</div>
          <div class="qlbl">Escanea para verificar</div>
          <div class="qurl">{{verificaUrl}}</div>
        </div>
        <div class="fbox">
          <div class="ink">{{FIRMA_ENTRENADOR}}</div>
          <div class="line">
            <div class="who">{{entrenador}}</div>
            <div class="role">Entrenador · Lic. {{licencia}}</div>
          </div>
        </div>
      </div>

      <div class="addr">
        <b>Calle 71 #57-55</b> · Barrio San Fernando, Bogotá D.C. &nbsp;·&nbsp;
        <b>www.staffandservices.info</b> &nbsp;·&nbsp; Cel. 322 884 2180 / 300 265 6398 &nbsp;·&nbsp; Tel. 601 565 8262
      </div>
    </div>
  </div>
</body>
</html>`