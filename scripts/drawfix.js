var callback;
var animationFrameRequested = false;

var requestAnimationFrame = (callback_) => 
{
        callback = callback_;
        animationFrameRequested = true;
}

var triggerCallback = () =>
{
        if (animationFrameRequested)
        {
                animationFrameRequested = false;
                callback();
        }
}

global.setInterval(triggerCallback, 1000 / 60);