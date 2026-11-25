/* cmatrix 数字雨：自 cmatrix.html 内联脚本迁移，使用 requestAnimationFrame 渲染。 */

(function () {
  'use strict';
  var colorArray = ['#00FF00'];
  var colorIndex = 0;
  var color = colorArray[0];
  function changeColor() {
    color = colorArray[colorIndex];
    colorIndex = (colorIndex + 1) % colorArray.length;
    setTimeout(changeColor, 2000);
  }

  var canvas = document.getElementById('hacker');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var columns = 0;
  var cells = [];
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.ceil(canvas.width / 12);
    cells = [];
    for (var i = 0; i < columns; i++) cells.push(0);
  }
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = '12px Microsoft YaHei';
    for (var i = 0; i < columns; i++) {
      var x = i * 12;
      var y = cells[i];
      ctx.fillText(String.fromCharCode(65 + Math.random() * 62), x, y);
      cells[i] = (y > Math.random() * 10 * canvas.height ? 0 : y + 12);
    }
  }
  function loop() {
    draw();
    requestAnimationFrame(loop);
  }
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });
  resize();
  changeColor();
  requestAnimationFrame(loop);
})();
