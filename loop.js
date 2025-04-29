let msPrev = window.performance.now();
const fps = 60;
const msPerFrame = 1000 / fps;


//an anticlockwise collection of 3 vertices in local space and a position
class Triangle {
    constructor(position, theta = 0, a = new Vec2d(0, -10), b = new Vec2d(-10, 10), c = new Vec2d(10, 10)) {
        this.position = position;
        this.theta = theta; // Rotation angle in radians
        this.localVertices = [a, b, c];
        this.transformedVertices = [];
        this.updateToWorldSpace();
    }

    rotateVertex(vertex) {
        let cosTheta = Math.cos(this.theta);
        let sinTheta = Math.sin(this.theta);
        return new Vec2d(
            vertex.x * cosTheta + vertex.y * sinTheta,
            -vertex.x * sinTheta + vertex.y * cosTheta // Adjusted for y-axis increasing downwards
        );
    }

    updateToWorldSpace() {
        this.transformedVertices = this.localVertices.map(vertex => 
            vec_add(this.position, this.rotateVertex(vertex))
        );
    }
}

class BoundingVolume{

    constructor(tri_array , bv_vertices){
        this.vertices=bv_vertices;
        this.items=tri_array;
        this.parent=null;
        this.child=[];
        this.name="";
    }
}

function calc_BoundingBox(tri_arr){

    let offset_num = 20;

    //iterate over every triangle and get its max and min vertex in the x and y axis
    let maxX= Number.NEGATIVE_INFINITY,
        minX= Number.POSITIVE_INFINITY,
        maxY= Number.NEGATIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY;

    if(tri_arr.length){
        for(let i=0;i< tri_arr.length;i++)
        {
            for(let j=0;j<tri_arr[i].transformedVertices.length;j++){
                if(tri_arr[i].transformedVertices[j].x > maxX)
                    maxX = tri_arr[i].transformedVertices[j].x;
                if(tri_arr[i].transformedVertices[j].x < minX)
                    minX = tri_arr[i].transformedVertices[j].x;
                if(tri_arr[i].transformedVertices[j].y > maxY)
                    maxY = tri_arr[i].transformedVertices[j].y;
                if(tri_arr[i].transformedVertices[j].y < minY)
                    minY = tri_arr[i].transformedVertices[j].y;
            }
            
        }

        maxX+=offset_num;
        maxY+=offset_num;
        minX-=offset_num;
        minY-=offset_num;

        return [ new Vec2d(minX,minY),new Vec2d(minX,maxY) , new Vec2d(maxX,maxY), new Vec2d(maxX,minY)];
    }

    else 
        return null;

}

let tri_arr=[];                 //holds the triangles

let mousePoint = new Vec2d(0,0);

let Bounding_Volumes_array=[]; //holds the bounding volumes

let collision_checks =0;       //for display purposes

let bounding_box_checks = 0;   //for display purposes

function splitBox_vertical(vertices) {     //GPT :)
    // Find min and max x-coordinates
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    
    for (let v of vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
    }

    // Compute the midpoint along the vertical axis
    let x_mid = (minX + maxX) / 2;

    // Generate new vertices for the left and right boxes
    let leftBox = [
        { x: minX, y: vertices[0].y },  // Top-left
        { x: minX, y: vertices[2].y },  // Bottom-left
        { x: x_mid, y: vertices[2].y }, // Bottom-mid
        { x: x_mid, y: vertices[0].y }  // Top-mid
    ];
    

    let rightBox = [
        { x: x_mid, y: vertices[0].y }, // Top-mid
        { x: x_mid, y: vertices[2].y },  // Top-right
        { x: maxX,  y: vertices[2].y },  // Bottom-right
        { x: maxX, y: vertices[0].y }  // Bottom-mid
    ];

    return [leftBox, rightBox];
}

function splitBox_horizontal(vertices) {    
    // Find min and max x-coordinates
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    
    for (let v of vertices) {
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    }

    // Compute the midpoint along the vertical axis
    let y_mid = (minY + maxY) / 2;

    // Generate new vertices for the left and right boxes
    let TopBox = [

        { x: vertices[0].x, y: minY }, 
        { x: vertices[0].x, y: y_mid}, 
        { x: vertices[2].x, y: y_mid}, 
        { x: vertices[2].x, y: minY } 
       
    ];
    

    let BottomBox = [
        { x: vertices[0].x, y: y_mid }, 
        { x: vertices[0].x, y: maxY}, 
        { x: vertices[2].x, y: maxY}, 
        { x: vertices[2].x, y: y_mid } 
    ];

    return [TopBox, BottomBox];
}


function divide_box(root_box,triangles)  //operates directly on the Bounding_Volumes_array
{
    
        //divide the box in half (in the y-axis or x-axis depending on the intersection test)
            //create a vertical line
            let point1 = new Vec2d((root_box.vertices[0].x + root_box.vertices[3].x)/2 , root_box.vertices[0].y);
            let point2 = new Vec2d((root_box.vertices[0].x + root_box.vertices[3].x)/2 , root_box.vertices[1].y);
            let dir1 = vec_sub(point2,point1);
            let count_vertical=0; 
            //for every line of every triangle
            for(let i=0;i<triangles.length;i++)
                { 
                    for(let j=0;j<triangles[i].transformedVertices.length;j++){
                        //check for intersections
                        let v1 = triangles[i].transformedVertices[j];
                        let v2 = triangles[i].transformedVertices[(j + 1) % 3];
                        let dir2 = vec_sub(v2, v1);
                        let intersection_tris = Line_Intersection_finite(point1, dir1, v1, dir2 );
                        if( intersection_tris)
                        {
                            //count the intersections
                            count_vertical++;
                        }
                    }   
                }
               
                //create a horizontal line
                let point1_h = new Vec2d(root_box.vertices[0].x  , (root_box.vertices[0].y + root_box.vertices[1].y )/2);
                let point2_h = new Vec2d(root_box.vertices[3].x  , (root_box.vertices[0].y + root_box.vertices[1].y )/2);
                let dir1_h = vec_sub(point2_h,point1_h);
                let count_horizontal=0; 
                for(let i=0;i<triangles.length;i++)
                    { 
                        for(let j=0;j<triangles[i].transformedVertices.length;j++){
                            //check for intersections
                            let v1 = triangles[i].transformedVertices[j];
                            let v2 = triangles[i].transformedVertices[(j + 1) % 3];
                            let dir2 = vec_sub(v2, v1);
                            let intersection_tris = Line_Intersection_finite(point1_h, dir1_h, v1, dir2 );
                            if( intersection_tris)
                            {
                                //count the intersections
                                count_horizontal++;
                            }
                        }   
                    }
                   
    
                
                 let [leftBox_verts, rightBox_verts]=[0,0];
           
                //compare the intersections 
                    //based on the comparisons select either horizontal or vertical
                if(count_horizontal > count_vertical)
                {
                    [leftBox_verts, rightBox_verts] = splitBox_vertical(root_box.vertices);
                }

                else if(count_vertical > count_horizontal)
                {
                    [leftBox_verts, rightBox_verts] = splitBox_horizontal(root_box.vertices);

                }
                else
                {
                    [leftBox_verts, rightBox_verts] = splitBox_horizontal(root_box.vertices);   
                }


        let left_child = new BoundingVolume([],leftBox_verts); 
        let right_child = new BoundingVolume([],rightBox_verts);


        for (let i = root_box.items.length - 1; i >= 0; i--) {   
            if (pointChecker_shape(root_box.items[i].position, left_child.vertices)) { 
                
                left_child.items.push(root_box.items[i]);  
                root_box.items.splice(i, 1);  
            } 
            else if (pointChecker_shape(root_box.items[i].position, right_child.vertices)) { 
                right_child.items.push(root_box.items[i]);  
                root_box.items.splice(i, 1);  
            }
        }
        
        left_child.parent = {value:root_box};
        right_child.parent= {value:root_box};

        root_box.child.push({value:left_child});
        root_box.child.push({value:right_child});

        
        

        Bounding_Volumes_array.push(left_child);
        Bounding_Volumes_array.push(right_child);

        
    
}

function recursive_divide(root,threshold=6)
{
    if(root.items && root.items.length< threshold){return;}
    else
    {
        divide_box(root,tri_arr);
        if(root.child && root.child.length){
           for(let i=0;i<root.child.length;i++)
           {
                recursive_divide(root.child[i].value);
           }
          
        }
        

    }
}

function recursive_search(root)     //has access to the renderer
{
    if(root.child.length)
    {
        if(pointChecker_shape(mousePoint,root.child[0].value.vertices))
            recursive_search(root.child[0].value);

        if(pointChecker_shape(mousePoint,root.child[1].value.vertices))
            recursive_search(root.child[1].value);
    }

    else
    {
        for(let i=0;i<root.items.length;i++)
        {
            if(pointChecker_shape(mousePoint,root.items[i].transformedVertices))
            {
                FillTriangle(root.items[i].transformedVertices[0],root.items[i].transformedVertices[1],root.items[i].transformedVertices[2],"yellow","yellow");
                for(let k=0;k<3;k++)
                    FillCircle(root.items[i].transformedVertices[k],3,"red");
            }
        }
    }

}

//for every mouse click
document.addEventListener("click",(event)=>{

        tri_arr.push(new Triangle(new Vec2d(event.clientX,event.clientY),Math.random() * 2 * Math.PI));

        document.getElementById("text").textContent = `Triangles: ${tri_arr.length}`;        
});

//whenever mouse moves
document.addEventListener("mousemove",(e)=>{

    mousePoint.x= e.clientX;
    mousePoint.y= e.clientY;
   
});

//for button click
document.addEventListener("DOMContentLoaded", function() {
    const myButton = document.getElementById("myButton");

    myButton.addEventListener("click", function(e) {

          e.stopPropagation(); // prevents the event from reaching the canvas

          //reconstruct the root bounding volume
          Bounding_Volumes_array=[];
          Bounding_Volumes_array.push(new BoundingVolume([...tri_arr], calc_BoundingBox([...tri_arr])));
      
      //recursively divide the boxes and keep track of the parent node
        //  divide_box(Bounding_Volumes_array[0]); //DONOT pass tri_arr by reference
        recursive_divide(Bounding_Volumes_array[0]);

    //for debug mode copy all the code in this event listener and paste into the every mouse click event listener 

    });
});


function Loop(){

    animationID = requestAnimationFrame(Loop);
    
         //=======handle timing===================//
        let msNow = window.performance.now();
        let dt = msNow - msPrev;
    
        if(dt < msPerFrame) return
        let excessTime = dt % msPerFrame
        msPrev = msNow - excessTime
        msPrev = msNow;
        dt=dt/1000;
       
       //==========================================//
        
       
        //clear screen
            ctx.beginPath();
            ctx.fillStyle = "white";
            ctx.fillRect(0,0,canvas.width ,canvas.height);
           
        //reset the collision index  and collision checks variable   
        collison_index=null;
        collision_checks=0;
    
        
       
    
            /*
                DEBUG MODE
                For every new triangle (i.e every mouse click)

                    1.Reconstruct the root node bounding volume    
                    2.divide the root node box in 2 and add both to the bounding volumes array if the number of items in the root exceed 10 and make them both children of root  
                    3.for both of these new boxes, check if number of items exceed 5 and further divide them in 2 and add them into the bounding volume array
                    4.keep doing until no box has more than 5 items
                    
                    problem: can't a triangle be within bounds of two bounding boxes?
                    problem2: which axis should the box be cut?  Sol: basically select the axis which intersects with the least amount of triangle edges

            
        
            */


              if(tri_arr.length){
                    for(let i=0;i<tri_arr.length;i++)
                    {
                        DrawTriangle(tri_arr[i].transformedVertices[0] ,tri_arr[i].transformedVertices[1], tri_arr[i].transformedVertices[2],"black");
                        for(let k=0;k<3;k++)
                            FillCircle(tri_arr[i].transformedVertices[k],3,"red");
                    }
                }



      
         //Draw the bounding volumes if there are any 
            if(Bounding_Volumes_array.length){

                for(let i =0;i<Bounding_Volumes_array.length;i++) {
                    
                    DrawPolygon3(Bounding_Volumes_array[i].vertices,"red");
                          
                }  
            }

        
            //search through the Bounding Volumes and savor the sweet performance benifits
            if(Bounding_Volumes_array.length)
                recursive_search(Bounding_Volumes_array[0]);

           
     
    }

    //=======================================================================================     
    
    
    Loop();
    