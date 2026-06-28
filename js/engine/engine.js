import { Renderer }
from "./renderer.js";

class Engine{

constructor(){

this.canvas =
document.getElementById(
"gameCanvas"
);

this.loadingFill =
document.getElementById(
"loadingFill"
);

this.loadingText =
document.getElementById(
"loadingText"
);

this.renderer =
new Renderer(this.canvas);

this.lastTime=0;

this.delta=0;

this.frames=0;

this.fps=0;

this.fpsTimer=0;

this.seed=Math.floor(

Math.random()*999999999

);

document
.getElementById("seed")
.innerHTML=
"Seed : "+this.seed;

this.initialize();

}

async initialize(){

await this.fakeLoad(
15,
"Starting Renderer..."
);

await this.fakeLoad(
35,
"Preparing Graphics..."
);

await this.fakeLoad(
55,
"Loading Engine..."
);

await this.fakeLoad(
80,
"Creating World..."
);

await this.fakeLoad(
100,
"Finished"
);

document
.getElementById(
"loadingScreen"
).style.display="none";

requestAnimationFrame(

this.loop.bind(this)

);

}

fakeLoad(percent,text){

return new Promise(resolve=>{

this.loadingFill.style.width=
percent+"%";

this.loadingText.innerHTML=
text;

setTimeout(resolve,300);

});

}

loop(time){

this.delta=
(time-this.lastTime)/1000;

this.lastTime=time;

this.frames++;

this.fpsTimer+=this.delta;

if(this.fpsTimer>=1){

this.fps=this.frames;

this.frames=0;

this.fpsTimer=0;

document
.getElementById("fps")
.innerHTML=
"FPS : "+this.fps;

}

this.renderer.render(
this.delta
);

requestAnimationFrame(

this.loop.bind(this)

);

}

}

new Engine();
