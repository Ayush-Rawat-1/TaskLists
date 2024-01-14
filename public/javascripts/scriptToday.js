//task list and array
const inputTask=document.getElementById("input-task");
const listContainer=document.getElementById("list-container");
const searchTask=document.getElementById("search-task");

let taskArray=[];
let imageChecked=[];
let edit_id=null;
let list=document.querySelectorAll("#list-container li");
let totalTask;
let totalPages;

//task per page
let taskPerPage=Number(document.getElementById("task-per-page").value);
let pageNumber=1;
const progressBar=document.getElementById("progress-bar");
let counter=0;
imageChecked.forEach((element)=>{
    if(element === 'check') counter+=1;
});


window.onload=async ()=>{
    inputTask.value='';
    searchTask.value='';
    await fetchTasks();
    if(imageChecked.length > 0){
        progressBar.value=(counter/imageChecked.length)*100;
    }else{
        progressBar.value=0;
    }
    showData(taskArray);
    generatePage();
    displayTaskPageWise();
}

//Fetch Tasks
async function fetchTasks() {
    showLoader();
    const response=await fetch('/task/getTask?id=today');
    hideLoader();
    if(response.ok){
        console.log("okk");
        const taskJson=await response.json();
        const data=taskJson.data;
        data.forEach(obj => {
            taskArray.push(obj.task);
            if(obj.checked){
                imageChecked.push('check');
                counter+=1;
            }else{
                imageChecked.push('uncheck');
            }
        });
    }else{
        alert("Failed to fetch data.Try again");
    }
}


//Add task
async function addTask(){
    if(inputTask.value === ''){
        alert("You must write something");
    }
    else{
        let flag=null;
        const newTask=inputTask.value;
        if(edit_id === null){
            showLoader();
            const response=await fetch('/task/addTask',{
                method:"POST",
                body: JSON.stringify({newTask : newTask,today: true}),
                headers:{
                    'Content-type': 'application/json',
                }
            });
            hideLoader();
            if(response.ok){
                taskArray.push(inputTask.value);
                imageChecked.push('uncheck');
            }else{
                console.log("failed");
                alert("Failed to add task.Try again");
            }
        }
        else{
            const prevTask=taskArray[edit_id];
            showLoader();
            const response=await fetch('/task/editTask',{
                method:"PUT",
                body: JSON.stringify({prevTask : prevTask,newTask : newTask,today: true}),
                headers:{
                    'Content-type': 'application/json',
                }
            });
            hideLoader();
            if(response.ok){
                if(imageChecked[edit_id] === 'check')
                    counter-=1;
                taskArray.splice(edit_id,1,inputTask.value);
                imageChecked.splice(edit_id,1,'uncheck');
                edit_id=null;
                flag=pageNumber;
            }else{
                console.log("failed");
                alert("Failed to add task.Try again");
            }
        }
        showData(taskArray);
        list=document.querySelectorAll("#list-container li");   
        totalTask=list.length;
        totalPages=Math.ceil(totalTask/taskPerPage);
        generatePage();
        displayTaskPageWise();
        if(flag === null){
            pageBtn(totalPages);
        }
        else
            pageBtn(flag);
    }
    document.getElementById("btn-add").innerHTML="Add";
    inputTask.value="";
}


//show data
function showData(taskArray){
    let htmlData='';
    taskArray.forEach((element ,idx)=> {
        let item=['fa-circle',''];
        if(imageChecked[idx] === 'check'){
            item=['fa-circle-check','item-check'];
        }
        htmlData+=`<li>
        <button class="btn-check" onclick="checkTask(${idx})">
        <span class="check-icon fa-regular ${item[0]}"></span></button>
        <strong class="task-in-li ${item[1]}" id="item${idx}">${element}</strong>
        <button class="btn-edit" onclick="editTask(${idx})"><i class="fa fa-edit"></i></button>
        <button class="btn-rem" onclick="removeTask(${idx})" ><i class="fa-solid fa-eraser"></i></button>
        </li>`;
    });
    listContainer.innerHTML=htmlData;
    list=document.querySelectorAll("#list-container li");
    totalTask=list.length;
    totalPages=Math.ceil(totalTask/taskPerPage);
    document.getElementById("task-completed").innerHTML=counter;
}

async function checkTask(idx) {
    document.getElementById(`item${idx}`).classList.toggle("item-check");
    let icons=document.querySelectorAll(".check-icon");
    let x=idx;
    idx=idx%taskPerPage;
    let checked=false;
    if(icons[idx].classList[2] === 'fa-circle'){
        icons[idx].classList.add('fa-circle-check');
        icons[idx].classList.remove('fa-circle');
        counter+=1;
        checked=true;
    }else{
        icons[idx].classList.remove('fa-circle-check');
        icons[idx].classList.add('fa-circle');
        counter-=1;
        checked=false;
    }
    progressBar.value=(counter/imageChecked.length)*100;
    document.getElementById("task-completed").innerHTML=counter;
    showLoader();
    const response=await fetch("/task/check",{
        method: "PATCH",
        body: JSON.stringify({task: taskArray[x],checked: checked,today: true}),
        headers:{
            'Content-type': 'application/json',
        }
    });
    hideLoader();
    if(response.ok){
        console.log("Done");
    }
    else{
        alert("Failed to delete task. Try again");
    }
}
async function removeTask(idx){
    showLoader();
    const response=await fetch("/task/delete",{
        method: "DELETE",
        body: JSON.stringify({task: taskArray[idx],today: true}),
        headers:{
            'Content-type': 'application/json',
        }
    });
    hideLoader();
    if(response.ok){
        taskArray.splice(idx,1);
        if(imageChecked[idx] === 'check') counter-=1;
        imageChecked.splice(idx,1);
    }
    else{
        alert("Failed to delete task. Try again");
    }
    showData(taskArray);
    list=document.querySelectorAll("#list-container li");
    totalTask=list.length;
    totalPages=Math.ceil(totalTask/taskPerPage);
    generatePage();
    displayTaskPageWise();

}

function editTask(idx) {
    edit_id=idx;
    inputTask.value=taskArray[idx];
    document.getElementById("btn-add").innerHTML="Edit";
    inputTask.setAttribute("autofocus");    
}

searchTask.addEventListener("input",(e)=>{
    document.getElementById("show-pages").classList.add("hide");
    if(searchTask.value==''){
        displayTaskPageWise();
        document.getElementById("show-pages").classList.remove("hide");
        document.getElementById("found").classList.add("hide");
        return;
    }
    let seachStr=e.target.value.toLowerCase();
    listContainer.innerHTML='';
    let matchingResult=0;
    list.forEach(li=>{
        
        if(li.querySelector(".task-in-li").innerHTML.toLowerCase().indexOf(seachStr)!=-1){
            listContainer.appendChild(li);
            matchingResult++;
        }
    });
    if(listContainer.innerHTML==''){
        listContainer.innerHTML="No task found";
        document.getElementById("found").classList.add("hide");
    }
    else{
        document.getElementById("found").classList.remove("hide");
        document.getElementById("found").innerHTML=`Matching result : ${matchingResult} of ${totalTask}`;
    }
});


function displayTaskPageWise() {
    if(totalTask == 0){
        document.getElementById("showing-page-wise").innerHTML="Add Task to view";
        document.getElementById("next-btn").classList.add("disable");
        document.getElementById("prev-btn").classList.add("disable");
        return;
    }
    let startingIndex=(pageNumber-1)*taskPerPage;
    let endingIndex=startingIndex+taskPerPage;
    if(endingIndex>totalTask)
        endingIndex=totalTask;
    let statement='';
    for(let i=startingIndex;i<endingIndex;i++){
        statement+='<li>'+list[i].innerHTML+'</li>';
    }
    listContainer.innerHTML=statement;
    if(statement == ''){ 
        pageNumber--;
        displayTaskPageWise();
        return;
    }
    document.querySelectorAll(".page-number")[pageNumber-1].classList.add("active");
    if(pageNumber == 1)
        document.getElementById("prev-btn").classList.add("disable");
    else{
        let diableClassList=document.getElementById("prev-btn");
        if(diableClassList.length!=0){
            document.getElementById("prev-btn").classList.remove("disable");
        }
    }
    if(pageNumber == totalPages)
        document.getElementById("next-btn").classList.add("disable");
    else{
        let diableClassList=document.getElementById("next-btn");
        if(diableClassList.length!=0){
            document.getElementById("next-btn").classList.remove("disable");
        }
    }
    document.getElementById("showing-page-wise").innerHTML=`Showing ${startingIndex+1} to ${endingIndex} of ${totalTask}`;
}

function generatePage() {
    searchTask.value='';
    let previousButton=`<a id="prev-btn" href="javascript:void(0)" onclick="prevBtn()">⏪</a>`;
    let nextButton=`<a id="next-btn" href="javascript:void(0)" onclick="nextBtn()">⏩</a>`;
    let pageButtons=``;
    
    for(i=1;i<=totalPages;i++){
        pageButtons+=`<a class="page-number" href="javascript:void(0)" onclick="pageBtn(${i})">${i}</a>`;
    }
    document.getElementById("pagination").innerHTML=`${previousButton} ${pageButtons} ${nextButton}`;
}
function prevBtn(){
    if(pageNumber != 1){
        document.querySelectorAll(".page-number")[pageNumber-1].classList.remove("active");
        pageNumber--;
        displayTaskPageWise();
    }
}
function nextBtn(){
    if(pageNumber != totalPages){
        document.querySelectorAll(".page-number")[pageNumber-1].classList.remove("active");
        pageNumber++;
        displayTaskPageWise();
    }
}
document.getElementById("task-per-page").addEventListener("change",()=>{
    taskPerPage=Number(document.getElementById("task-per-page").value);
    pageNumber=1;
    totalPages=Math.ceil(totalTask/taskPerPage);
    generatePage();
    displayTaskPageWise();
});
function pageBtn(index) {
    //if(index == 0) return;
    document.querySelectorAll(".page-number")[pageNumber-1].classList.remove("active");
    pageNumber=index;
    displayTaskPageWise();
}

inputTask.addEventListener("keypress", function(event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("btn-add").click();
    }
});

// Function to show the loader and overlay
function showLoader() {
    var overlay = document.getElementById('overlay');
    var loaderContainer = document.getElementById('loader');

    overlay.style.display = 'block';
    loaderContainer.style.display = 'flex';
}

// Function to hide the loader and overlay
function hideLoader() {
    var overlay = document.getElementById('overlay');
    var loaderContainer = document.getElementById('loader');

    overlay.style.display = 'none';
    loaderContainer.style.display = 'none';
}

// Function to simulate a backend request
async function genAI() {
    if(taskArray.length>0){
        showLoader();
        const response=await fetch("/task/genai",{
            method: "POST",
            body: JSON.stringify({
                work: 'task',
                taskArray: taskArray
            }),headers:{
                'Content-type': 'application/json',
            }
        });
        hideLoader();
        if(response.ok){
            const { aiText }=await response.json();
            document.getElementById("aiResponse").innerHTML=`<p>${aiText}</p>`;
        }else{
            console.log("failed");
            alert("Failed to fetch response.Try again");
        }
    }else{
        document.getElementById("aiResponse").innerHTML=`<p>Add Task to generate response.</p>`;
    }
}