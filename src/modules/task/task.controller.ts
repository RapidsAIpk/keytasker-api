import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TaskService } from './task.service';

@ApiBearerAuth()
@ApiTags('tasks')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task (Admin only)' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    return this.taskService.create(createTaskDto, req.user.id);
  }

@Patch('find-all-tasks')
  findAll(@Request() req: any, @Body() filterDto: TaskFilterDto) {
    return this.taskService.findAll(filterDto, req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getStats(@Request() req: any) {
    return this.taskService.getTaskStats(req.user.id);
  }

  @Get('reservations')
  @ApiOperation({ summary: "Get current user's task reservations" })
  @ApiResponse({
    status: 200,
    description: 'Reservations retrieved successfully',
  })
  getUserReservations(@Request() req: any) {
    return this.taskService.getUserReservations(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Cannot access tasks from campaigns already interacted with',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.taskService.findOne(id, req.user.id);
  }

  @Post(':id/reserve')
  @ApiOperation({ summary: 'Reserve a task for completion' })
  @ApiResponse({ status: 201, description: 'Task reserved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Task not available or already reserved' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'Task ID to reserve' })
  reserveTask(@Param('id') id: string, @Request() req: any) {
    return this.taskService.reserveTask(id, req.user.id);
  }

  @Delete('reservations/:id')
  @ApiOperation({ summary: 'Cancel a task reservation' })
  @ApiResponse({
    status: 200,
    description: 'Reservation cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only cancel own reservations',
  })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  cancelReservation(@Param('id') id: string, @Request() req: any) {
    return this.taskService.cancelReservation(id, req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a task (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(@Body() updateTaskDto: UpdateTaskDto, @Request() req: any) {
    return this.taskService.update(updateTaskDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (Admin only, soft delete)' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'Task ID to delete' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.taskService.remove(id, req.user.id);
  }
}