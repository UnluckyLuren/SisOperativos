//built by marcus sacco without help from stackoverflow
//use this as an orb-y canvas layer,
//adjust rgba (line 23) to taste

var canvas = document.getElementById('orbGen');
var orbCount = 100;
var ctx = canvas.getContext('2d');
ctx.canvas.width  = window.innerWidth;
ctx.canvas.height = window.innerHeight;
var y = canvas.height;
var x = canvas.width;
var orb = new Object();

//build list of orbs 
for(i=0; i<orbCount; i++){
  orb[i] = new Object();
  //make random size, position for each orb
  orb[i].size = Math.floor(Math.random()*20+3);
  orb[i].posX = Math.floor(Math.random()*x);
  orb[i].posY = Math.floor(Math.random()*y);
  orb[i].path = Math.random();
  //make random orange-y color for each orb
	orb[i].color = "rgba("+
    Math.floor(Math.random()*242+220)+","+ 
    Math.floor(Math.random()*118+100)+","+
    Math.floor(Math.random()*64+50)+","+
    Math.random()*.2+")";
}

//clear canvas, increment path, and draw
function draw(){
  if (canvas.getContext){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(l=0;l<orbCount;l++){
      //only three general directions? yeah...
      //trying to find less redundant way to do this:
      if(orb[l].path<.3){
        orb[l].posY += Math.floor(Math.random()*2); 
      	orb[l].posX += Math.floor(Math.random()*2);
      }else if(orb[l].path<.6){
        orb[l].posY -= Math.floor(Math.random()*2); 
      	orb[l].posX -= Math.floor(Math.random()*2);
      }else if(orb[l].path<1){
        orb[l].posY += Math.floor(Math.random()*2); 
      	orb[l].posX -= Math.floor(Math.random()*2);
      }
       
    	ctx.beginPath();
    	ctx.arc(orb[l].posX,
              orb[l].posY,
              orb[l].size,
              0,
              Math.PI*2,
              true);
    	ctx.fillStyle = orb[l].color; 
    	ctx.fill();
      //i love pretty indentation
    }   
  }
}

setInterval(draw,60);