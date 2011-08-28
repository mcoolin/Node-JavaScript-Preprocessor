/* 
*   a simple test of the if endif logic
*
*/
//@define Hello

//@if Hello
    This should show
//@else
    This should be commented
//@endif

//@include nestedfile3.js

//@if DEBUG
    This should be commented
//@else
    This should show
//@endif

//@if DEBUG
    //@if WIRE
        This should be commented
    //@else
        This should be commented (because its nested out)
    //@endif
//@else
    This should show
//@endif

//@if DEBUG
    This should be commented
//@endif
//@if DEBUG
    //@include nofile.js  this should not show
//@endif
//@if Hello,DEBUG
This should show
//@endif